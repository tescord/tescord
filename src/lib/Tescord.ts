import { Pack } from "$lib/Pack";
import { Client, ClientOptions, Collection } from "discord.js";
import { defaultify } from "stuffs"
import { handleEvent } from "$utils/handleEvent";
import { TescordClientEventMap } from "$types/ClientEvents";
import { Interaction } from "$types/Interactions";
import { EventData } from "$types/Events";
import { Inspector } from "$lib/Inspector";
import { ContentValue, Locale, InteractionLocaleData, Language } from "$lib/Locale";
import { publishInteractions } from "$utils/publishInteractions";
import { ComponentBuildConfig, ValidComponentId, encodeCustomDataSync, BuiltComponent, encodeCustomData, BuiltComponentReturn } from "$types/ComponentBuilder";
import { ButtonStyleNames } from "$types/ComponentOptions";
import { ComponentType, ButtonStyle, ModalComponentData } from "discord.js";
import { PackEventMap } from "$types/PackEvents";
import { ResultEventEmitter } from "$types/ResultEventEmitter";

export type TescordConfigClient = { id: string, options: ClientOptions, token: string };
export type TescordClient = { id: string, client: Client, token: string };

export interface TescordConfig {
  id: string;
  clients: TescordConfigClient[];
  defaults?: {
    language?: Language;
  };
}

export type SelectComponent = ComponentType.StringSelect | ComponentType.UserSelect | ComponentType.RoleSelect | ComponentType.ChannelSelect | ComponentType.MentionableSelect;

export type CacheData<T> = {
  path: string[];
  data: T;
}

export class Tescord extends Pack<TescordConfig> {

  // Note: We inherit the propagating event system from Pack
  // No need to override events property as Pack already handles propagation

  cache = {
    locales: new Collection<string, CacheData<Locale>>(),
    subPacks: new Collection<string, CacheData<Pack>>(),
    interactions: new Collection<string, CacheData<Interaction>>(),
    events: new Collection<string, CacheData<EventData>>(),
    inspectors: new Collection<string, CacheData<Inspector>>(),
  }

  locales = {
    content: new Collection<string, ContentValue>(),
    interaction: new Collection<string, Record<string, InteractionLocaleData>>(),
  }

  clients = new Collection<string, TescordClient>();

  constructor(config: TescordConfig) {
    super(config);
  }

  refreshClients() {
    this.clients.clear();
    this.config.clients.forEach(({ id, options, token }) => {
      this.clients.set(id, { id, client: new Client(options), token });
    });
  }

  refresh() {
    this.cache.locales.clear();
    this.cache.subPacks.clear();
    this.cache.interactions.clear();
    this.cache.events.clear();
    this.cache.inspectors.clear();

    this.locales.content.clear();
    this.locales.interaction.clear();

    this.pushCache(this);

    const contentLocales: string[] = [];
    const interactionLocales: string[] = [];
    const defaultLanguage = this.config.defaults?.language || 'en';

    // First pass: collect all content locales without defaultify
    for (const [key, value] of this.cache.locales) {
      const locale = value.data;
      
      for (const [language, contentValue] of locale.content) {
        let currentContentLocale = (this.locales.content.get(language) ?? {});
        currentContentLocale = defaultify(contentValue, currentContentLocale, true);
        this.locales.content.set(language, currentContentLocale);
        if (!contentLocales.includes(language)) contentLocales.push(language);
      }

      for (const [language, interactionValue] of locale.interaction) {
        let currentInteractionLocale = (this.locales.interaction.get(language) ?? {});
        // Properly merge interaction locales by interaction ID
        for (const [interactionId, localeData] of Object.entries(interactionValue)) {
          currentInteractionLocale[interactionId] = localeData;
        }
        this.locales.interaction.set(language, currentInteractionLocale);
        if (!interactionLocales.includes(language)) interactionLocales.push(language);
      }
    }

    // Second pass: recursively defaultify all content locales with the default language
    const defaultContentLocale = this.locales.content.get(defaultLanguage) || {} as ContentValue;
    
    for (const [language, contentValue] of this.locales.content) {
      if (language !== defaultLanguage) {
        // Recursively defaultify this language's content with the default language
        const enhancedContentLocale = defaultify(contentValue, defaultContentLocale, true);
        this.locales.content.set(language, enhancedContentLocale);
      }
    }

    this.emitEvent('tescord:cacheRefreshed', { timestamp: Date.now() });
    this.emitEvent('tescord:localesRefreshed', { contentLocales, interactionLocales });
  }

  private pushCache(pack: Pack<any>, path: string[] = []) {
    pack.data.locales.forEach((locale, key) => this.cache.locales.set(key, { path, data: locale }));
    pack.data.interactions.forEach((interaction, key) => this.cache.interactions.set(key, { path, data: interaction as Interaction }));
    pack.data.events.forEach((event, key) => this.cache.events.set(key, { path, data: event }));
    pack.data.inspectors.forEach((inspector, key) => this.cache.inspectors.set(key, { path, data: inspector }));

    pack.data.subPacks.forEach((subPack, key) => {
      this.cache.subPacks.set(key, { path, data: subPack });
      this.pushCache(subPack, [...path, pack.id]);
    });
  }

  async start() {
    this.refreshClients();
    this.refresh();
    for (const tescordClient of this.clients.values()) {
      const originalEmit = tescordClient.client.emit.bind(tescordClient.client);

      tescordClient.client.emit = (event: string, ...args: unknown[]) => {
        // Handle known Discord.js events through our system
        if (event in TescordClientEventMap) {
          handleEvent(this, tescordClient, event as keyof typeof TescordClientEventMap, args);
        }
        
        // Emit generic Tescord events with proper typing - NOW PROPAGATES to all subpacks automatically
        this.events.emit("tescord:clientEvent", { client: tescordClient, event, args });
        this.events.emit(`${tescordClient.id}:${event}` as const, { client: tescordClient, event, args });
        
        return originalEmit(event, ...args);
      };

      // @ts-ignore
      tescordClient.client._emit = originalEmit;

      await tescordClient.client.login(tescordClient.token);

      // NOW PROPAGATES to all subpacks automatically
      this.events.emit("tescord:clientReady", { client: tescordClient });
    }

    // NOW PROPAGATES to all subpacks automatically
    this.events.emit("tescord:clientsReady", { clients: this.clients });
  }

  async publish(guildId?: string) {
    this.refreshClients();
    this.refresh();
    try {
      await publishInteractions(this, guildId);
      
      // Emit success events for each client - NOW PROPAGATES to all subpacks automatically
      for (const client of this.clients.values()) {
        this.events.emit('tescord:interactionsPublished', { 
          clientId: client.id, 
          count: this.cache.interactions.size 
        });
      }
    } catch (error) {
      // Emit error events for each client - NOW PROPAGATES to all subpacks automatically
      for (const client of this.clients.values()) {
        this.events.emit('tescord:interactionsPublishError', { 
          clientId: client.id, 
          error: error as Error 
        });
      }
      throw error;
    }
  }

  buildComponent<T extends ValidComponentId>(config: ComponentBuildConfig<T>): BuiltComponentReturn<T> {
    // Find the component registration in cache
    const cachedComponent = this.cache.interactions.get(config.id as string);
    
    if (!cachedComponent) {
      throw new Error(`Component with id "${String(config.id)}" not found. Make sure it's registered in a pack.`);
    }

    const componentData = cachedComponent.data;
    
    // Generate custom ID with encoded data, using synchronous version for sync context
    const customId = encodeCustomDataSync(config.id as string, config.data, this.events);

    // Build button component
    if (componentData.type === 'Button') {
      const buttonOptions = (componentData as any).options || {};
      const overrides = (config.overrides as any) || {};

      // Merge options with overrides using defaultify
      const finalOptions = defaultify(overrides, buttonOptions, true);

      // Convert style names to Discord.js ButtonStyle enum values
      const getButtonStyle = (styleName: ButtonStyleNames = 'Primary'): ButtonStyle => {
        const styleMap: Record<ButtonStyleNames, ButtonStyle> = {
          'Primary': ButtonStyle.Primary,
          'Secondary': ButtonStyle.Secondary,
          'Success': ButtonStyle.Success,
          'Danger': ButtonStyle.Danger,
          'Link': ButtonStyle.Link
        };
        return styleMap[styleName];
      };

      const builtButton = {
        type: ComponentType.Button,
        style: getButtonStyle(finalOptions.style),
        label: finalOptions.label,
        disabled: finalOptions.disabled ?? false,
        ...(finalOptions.url ? { url: finalOptions.url } : { customId }),
        ...(finalOptions.emoji ? { emoji: finalOptions.emoji } : {})
      } as const;

      return builtButton as BuiltComponentReturn<T>;
    }

    // Build select menu components
    if (componentData.type === 'StringSelectMenu' || 
        componentData.type === 'UserSelectMenu' || 
        componentData.type === 'RoleSelectMenu' || 
        componentData.type === 'ChannelSelectMenu' || 
        componentData.type === 'MentionableSelectMenu') {
      
      const selectOptions = (componentData as any).options || {};
      const overrides = (config.overrides as any) || {};

      // Merge options with overrides using defaultify
      const finalOptions = defaultify(overrides, selectOptions, true);

      // Build specific select menu types based on component type
      if (componentData.type === 'StringSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.StringSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          options: finalOptions.options || [],
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'UserSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.UserSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'RoleSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.RoleSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'ChannelSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.ChannelSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.channelTypes ? { channelTypes: finalOptions.channelTypes } : {}),
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'MentionableSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.MentionableSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
    }

    // Build modal component
    if (componentData.type === 'Modal') {
      const modalOptions = (componentData as any).options || {};
      const overrides = (config.overrides as any) || {};

      // Merge options with overrides using defaultify
      const finalOptions = defaultify(overrides, modalOptions, true);

      const builtModal = {
        customId,
        title: finalOptions.title || 'Modal',
        components: finalOptions.components || []
      } as const;

      return builtModal as BuiltComponentReturn<T>;
    }

    throw new Error(`Unsupported component type for id "${String(config.id)}"`);
  }

  // Async version of buildComponent for when sequential processing is needed
  async buildComponentAsync<T extends ValidComponentId>(config: ComponentBuildConfig<T>): Promise<BuiltComponentReturn<T>> {
    // Find the component registration in cache
    const cachedComponent = this.cache.interactions.get(config.id as string);
    
    if (!cachedComponent) {
      throw new Error(`Component with id "${String(config.id)}" not found. Make sure it's registered in a pack.`);
    }

    const componentData = cachedComponent.data;
    
    // Generate custom ID with encoded data, using async version for sequential processing
    const customId = await encodeCustomData(config.id as string, config.data, this.events);

    // Build button component
    if (componentData.type === 'Button') {
      const buttonOptions = (componentData as any).options || {};
      const overrides = (config.overrides as any) || {};

      // Merge options with overrides using defaultify
      const finalOptions = defaultify(overrides, buttonOptions, true);

      // Convert style names to Discord.js ButtonStyle enum values
      const getButtonStyle = (styleName: ButtonStyleNames = 'Primary'): ButtonStyle => {
        const styleMap: Record<ButtonStyleNames, ButtonStyle> = {
          'Primary': ButtonStyle.Primary,
          'Secondary': ButtonStyle.Secondary,
          'Success': ButtonStyle.Success,
          'Danger': ButtonStyle.Danger,
          'Link': ButtonStyle.Link
        };
        return styleMap[styleName];
      };

      const builtButton = {
        type: ComponentType.Button,
        style: getButtonStyle(finalOptions.style),
        label: finalOptions.label,
        disabled: finalOptions.disabled ?? false,
        ...(finalOptions.url ? { url: finalOptions.url } : { customId }),
        ...(finalOptions.emoji ? { emoji: finalOptions.emoji } : {})
      } as const;

      return builtButton as BuiltComponentReturn<T>;
    }

    // Build select menu components
    if (componentData.type === 'StringSelectMenu' || 
        componentData.type === 'UserSelectMenu' || 
        componentData.type === 'RoleSelectMenu' || 
        componentData.type === 'ChannelSelectMenu' || 
        componentData.type === 'MentionableSelectMenu') {
      
      const selectOptions = (componentData as any).options || {};
      const overrides = (config.overrides as any) || {};

      // Merge options with overrides using defaultify
      const finalOptions = defaultify(overrides, selectOptions, true);

      // Build specific select menu types based on component type
      if (componentData.type === 'StringSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.StringSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          options: finalOptions.options || [],
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'UserSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.UserSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'RoleSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.RoleSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'ChannelSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.ChannelSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.channelTypes ? { channelTypes: finalOptions.channelTypes } : {}),
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
      
      if (componentData.type === 'MentionableSelectMenu') {
        const builtSelectMenu = {
          type: ComponentType.MentionableSelect,
          customId,
          placeholder: finalOptions.placeholder,
          minValues: finalOptions.minValues ?? 1,
          maxValues: finalOptions.maxValues ?? 1,
          disabled: finalOptions.disabled ?? false,
          ...(finalOptions.defaultValues ? { defaultValues: finalOptions.defaultValues } : {})
        } as const;
        return builtSelectMenu as BuiltComponentReturn<T>;
      }
    }

    // Build modal component
    if (componentData.type === 'Modal') {
      const modalOptions = (componentData as any).options || {};
      const overrides = (config.overrides as any) || {};

      // Merge options with overrides using defaultify
      const finalOptions = defaultify(overrides, modalOptions, true);

      const builtModal = {
        customId,
        title: finalOptions.title || 'Modal',
        components: finalOptions.components || []
      } as const;

      return builtModal as BuiltComponentReturn<T>;
    }

    throw new Error(`Unsupported component type for id "${String(config.id)}"`);
  }

  override destroy(): void {
    super.destroy();

    this.clients.forEach((client) => {
      client.client.destroy();
      // NOW PROPAGATES to all subpacks automatically
      this.events.emit("tescord:clientDestroy", { client });
    });
  }
}
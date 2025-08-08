import { Tescord, TescordClient } from "$lib/Tescord";
import { TescordClientEventMap } from "$types/ClientEvents";
import { ContentValue } from "$lib/Locale";
import { Guild, User, Interaction } from "discord.js";
import { handleInteraction } from "./handleInteraction";

// Helper to extract guild, user, and interaction from event context
function extractContextInfo(eventName: string, args: any[]): { guild: Guild | null, user: User | null, interaction: Interaction | null } {
  const eventParams = TescordClientEventMap[eventName as keyof typeof TescordClientEventMap];
  if (!eventParams) return { guild: null, user: null, interaction: null };

  let guild: Guild | null = null;
  let user: User | null = null;
  let interaction: Interaction | null = null;

  // Map the args to their parameter names and extract guild/user/interaction
  const context = Object.fromEntries(
    eventParams.map((param, index) => [param, args[index]])
  );

  // Extract interaction first
  if (context.interaction && typeof context.interaction === 'object' && 'isCommand' in context.interaction) {
    interaction = context.interaction as Interaction;
  }

  // Try to extract guild from common patterns
  if (context.guild && typeof context.guild === 'object' && 'id' in context.guild) {
    guild = context.guild as Guild;
  } else if (args[0] && args[0].guild && typeof args[0].guild === 'object' && 'id' in args[0].guild) {
    guild = args[0].guild as Guild;
  } else if (args[0] && args[0] instanceof Guild) {
    guild = args[0] as Guild;
  } else if (context.member?.guild) {
    guild = context.member.guild;
  } else if (context.message?.guild) {
    guild = context.message.guild;
  } else if (interaction?.guild) {
    guild = interaction.guild;
  }

  // Try to extract user from common patterns
  if (context.user && typeof context.user === 'object' && 'id' in context.user) {
    user = context.user as User;
  } else if (context.member?.user) {
    user = context.member.user;
  } else if (context.message?.author) {
    user = context.message.author;
  } else if (interaction?.user) {
    user = interaction.user;
  }

  return { guild, user, interaction };
}

// Helper function to create localization objects for events
function createEventLocalizationObjects(
  tescord: Tescord,
  guild: Guild | null,
  interaction: Interaction | null
) {
  // Get default language from Tescord config, fallback to 'en'
  const defaultLanguage = tescord.config.defaults?.language || 'en';
  const defaultLocalization = tescord.locales.content.get(defaultLanguage) || {} as ContentValue;

  const guildLocale = guild?.preferredLocale?.split('-')[0] || defaultLanguage;
  const userLocale = interaction?.locale?.split('-')[0] || guildLocale;

  const guildLocalization = tescord.locales.content.get(guildLocale) || defaultLocalization;
  const userLocalization = tescord.locales.content.get(userLocale) || defaultLocalization;

  return {
    locale: {
      guild: guildLocalization,
      user: userLocalization
    }
  };
}

export async function handleEvent(
  tescord: Tescord,
  client: TescordClient,
  eventName: keyof typeof TescordClientEventMap,
  args: any[]
) {
  try {
    const eventParams = TescordClientEventMap[eventName];
    if (!eventParams) return;

    // Create event context object
    const context = Object.fromEntries(
      eventParams.map((param, index) => [param, args[index]])
    );

    // Handle interaction events separately
    if (eventName === 'interactionCreate' && context.interaction) {
      await handleInteraction(tescord, client, context.interaction as Interaction);
    }

    // Extract guild, user, and interaction for localization
    const { guild, user, interaction } = extractContextInfo(eventName, args);

    // Add localization objects to context
    const localizationObjects = createEventLocalizationObjects(
      tescord,
      guild,
      interaction
    );

    for await (const result of tescord.emitToSubPacksWithAsyncIterator("beforeEvent", { ...context, eventName, guild })) {
      if (result === false) {
        // Cancel event propagation if result is explicitly false
        return;
      }
      if (result && typeof result === "object") {
        Object.assign(context, result);
      }
    }

    const enhancedContext = {
      ...context,
      ...localizationObjects
    };

    // Handle registered events
    for (const [key, cachedEvent] of tescord.cache.events) {
      const eventData = cachedEvent.data;

      if (eventData.event === eventName) {
        for await (const result of tescord.emitToSubPacksWithAsyncIterator("beforeEventHandle", { ...context, eventName })) {
          if (result === false) {
            continue;
          }
        }
        await eventData.handle(enhancedContext);
      }
    }

    // Emit to pack event emitters
    tescord.events.emit(eventName, enhancedContext);

  } catch (error) {
    tescord.events.emit('tescord:eventHandlerError', {
      error,
      eventName,
      args,
      client
    });
  }
}
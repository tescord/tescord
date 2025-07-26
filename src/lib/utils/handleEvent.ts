import { Tessen, TessenClient } from "$lib/Tessen";
import { TessenClientEventMap } from "$types/ClientEvents";
import { ContentValue } from "$lib/Locale";
import { Guild, User, Interaction } from "discord.js";
import { handleInteraction } from "./handleInteraction";

// Helper to extract guild, user, and interaction from event context
function extractContextInfo(eventName: string, args: any[]): { guild: Guild | null, user: User | null, interaction: Interaction | null } {
  const eventParams = TessenClientEventMap[eventName as keyof typeof TessenClientEventMap];
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
  tessen: Tessen,
  guild: Guild | null,
  interaction: Interaction | null
) {
  // Get default language from Tessen config, fallback to 'en'
  const defaultLanguage = tessen.config.defaults?.language || 'en';
  const defaultLocalization = tessen.locales.content.get(defaultLanguage) || {} as ContentValue;
  
  const guildLocale = guild?.preferredLocale?.split('-')[0] || defaultLanguage;
  const userLocale = interaction?.locale?.split('-')[0] || guildLocale;
  
  const guildLocalization = tessen.locales.content.get(guildLocale) || defaultLocalization;
  const userLocalization = tessen.locales.content.get(userLocale) || defaultLocalization;

  return {
    locale: {
      guild: guildLocalization,
      user: userLocalization
    }
  };
}

export async function handleEvent(
  tessen: Tessen,
  client: TessenClient,
  eventName: keyof typeof TessenClientEventMap,
  args: any[]
) {
  try {
    const eventParams = TessenClientEventMap[eventName];
    if (!eventParams) return;

    // Create event context object
    const context = Object.fromEntries(
      eventParams.map((param, index) => [param, args[index]])
    );

    // Handle interaction events separately
    if (eventName === 'interactionCreate' && context.interaction) {
      await handleInteraction(tessen, client, context.interaction as Interaction);
    }

    // Extract guild, user, and interaction for localization
    const { guild, user, interaction } = extractContextInfo(eventName, args);

    // Add localization objects to context
    const localizationObjects = createEventLocalizationObjects(
      tessen,
      guild,
      interaction
    );

    const enhancedContext = {
      ...context,
      ...localizationObjects
    };

    // Handle registered events
    for (const [key, cachedEvent] of tessen.cache.events) {
      const eventData = cachedEvent.data;
      
      if (eventData.event === eventName) {
        await eventData.handle(enhancedContext);
      }
    }

    // Emit to pack event emitters
    tessen.events.emit(eventName, enhancedContext);
    
  } catch (error) {
    tessen.events.emit('tessen:eventHandlerError', {
      error,
      eventName,
      args,
      client
    });
  }
}
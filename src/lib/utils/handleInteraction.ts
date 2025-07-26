import { Tessen, TessenClient } from "$lib/Tessen";
import { Interaction as DiscordInteraction, Guild, User } from "discord.js";
import { ContentValue, GetLocalization } from "$lib/Locale";
import { ChatInputInteractionWrapper, ButtonInteractionWrapper, StringSelectMenuInteractionWrapper, UserSelectMenuInteractionWrapper, RoleSelectMenuInteractionWrapper, ChannelSelectMenuInteractionWrapper, MentionableSelectMenuInteractionWrapper, ModalInteractionWrapper, UserContextMenuInteractionWrapper, MessageContextMenuInteractionWrapper, AutocompleteInteractionWrapper } from "$types/Interactions";
import { AutocompleteInteraction, ApplicationCommandOptionType } from "discord.js";
import { SlashCommandOptionChoices } from "$types/SlashCommand";
import { parseCustomData } from "$types/ComponentBuilder";

// Helper function to create localization objects for interactions
function createInteractionLocalizationObjects(
  tessen: Tessen,
  guild: Guild | null,
  interaction: DiscordInteraction
) {
  // Get default language from Tessen config, fallback to 'en'
  const defaultLanguage = tessen.config.defaults?.language || 'en';
  const defaultLocalization = tessen.locales.content.get(defaultLanguage) || {} as ContentValue;
  
  const guildLocale = guild?.preferredLocale?.split('-')[0] || defaultLanguage;
  const userLocale = interaction.locale?.split('-')[0] || guildLocale;
  
  const guildLocalization = tessen.locales.content.get(guildLocale) || defaultLocalization;
  const userLocalization = tessen.locales.content.get(userLocale) || defaultLocalization;

  return {
    locale: {
      guild: guildLocalization as GetLocalization,
      user: userLocalization as GetLocalization
    }
  };
}

// Helper function to create base interaction context
function createBaseInteractionContext(
  tessen: Tessen,
  client: TessenClient,
  guild: Guild | null,
  interaction: DiscordInteraction
) {
  const localizationObjects = createInteractionLocalizationObjects(tessen, guild, interaction);
  
  return {
    client,
    ...localizationObjects
  };
}

export async function handleInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: DiscordInteraction
) {
  try {
    if (interaction.isAutocomplete()) {
      await handleAutocompleteInteraction(tessen, client, interaction);
    } else if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(tessen, client, interaction);
    } else if (interaction.isUserContextMenuCommand()) {
      await handleUserContextMenuCommand(tessen, client, interaction);
    } else if (interaction.isMessageContextMenuCommand()) {
      await handleMessageContextMenuCommand(tessen, client, interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(tessen, client, interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleStringSelectMenuInteraction(tessen, client, interaction);
    } else if (interaction.isUserSelectMenu()) {
      await handleUserSelectMenuInteraction(tessen, client, interaction);
    } else if (interaction.isRoleSelectMenu()) {
      await handleRoleSelectMenuInteraction(tessen, client, interaction);
    } else if (interaction.isChannelSelectMenu()) {
      await handleChannelSelectMenuInteraction(tessen, client, interaction);
    } else if (interaction.isMentionableSelectMenu()) {
      await handleMentionableSelectMenuInteraction(tessen, client, interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmitInteraction(tessen, client, interaction);
    }
  } catch (error) {
    tessen.events.emit('tessen:interactionHandlerError', {
      error,
      interaction,
      client
    });
  }
}

async function handleAutocompleteInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: AutocompleteInteraction
) {
  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand(false);
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  
  // Build full command name
  let fullCommandName = commandName;
  if (subcommandGroup) fullCommandName += ` ${subcommandGroup}`;
  if (subcommand) fullCommandName += ` ${subcommand}`;

  const discordFocusedOption = interaction.options.getFocused(true);
  
  // Transform Discord.js enum type to our string type
  const getOptionTypeString = (type: ApplicationCommandOptionType): "String" | "Integer" | "Number" => {
    switch (type) {
      case ApplicationCommandOptionType.String:
        return "String";
      case ApplicationCommandOptionType.Integer:
        return "Integer";
      case ApplicationCommandOptionType.Number:
        return "Number";
      default:
        return "String"; // Fallback
    }
  };

  const focusedOption = {
    name: discordFocusedOption.name,
    value: discordFocusedOption.value,
    type: getOptionTypeString(discordFocusedOption.type)
  };

  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: AutocompleteInteractionWrapper = {
    type: 'autocomplete',
    interaction,
    commandName: fullCommandName,
    focusedOption,
    ...baseContext
  };

  // Find the matching slash command
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    // Check if it's a slash command with nameCombinations property
    if ('nameCombinations' in interactionData && 
        interactionData.nameCombinations?.includes(fullCommandName) && 
        (!interactionData.type || interactionData.type === 'ChatInput') &&
        'options' in interactionData && interactionData.options) {
      
      const option = interactionData.options[focusedOption.name];
      if (option && 'autoComplete' in option && option.autoComplete) {
        try {
          const autocompleteContext = {
            value: focusedOption.value,
            focused: true,
            interaction
          };

          const choices = await option.autoComplete(autocompleteContext);
          
          // Convert object-based choices to Discord.js format
          const discordChoices = Object.entries(choices).map(([value, name]) => ({
            name: String(name),
            value: option.type === 'String' ? String(value) : Number(value)
          })).slice(0, 25); // Discord limits to 25 choices

          await interaction.respond(discordChoices);
          return;
        } catch (error) {
          tessen.events.emit('tessen:autocompleteError', {
            error,
            interaction,
            option: focusedOption.name,
            client
          });
          await interaction.respond([]);
          return;
        }
      }
    }
  }

  // If no autocomplete function found, respond with empty array
  await interaction.respond([]);
}

async function handleChatInputCommand(
  tessen: Tessen,
  client: TessenClient,
  interaction: ChatInputInteractionWrapper['interaction']
) {
  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand(false);
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  
  // Build full command name
  let fullCommandName = commandName;
  if (subcommandGroup) fullCommandName += ` ${subcommandGroup}`;
  if (subcommand) fullCommandName += ` ${subcommand}`;

  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: ChatInputInteractionWrapper = {
    type: 'chatInput',
    interaction,
    commandName: fullCommandName,
    ...baseContext
  };

  // Check cached interactions for slash commands
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    // Check if it's a slash command with nameCombinations property
    if ('nameCombinations' in interactionData && 
        interactionData.nameCombinations?.includes(fullCommandName) && 
        (!interactionData.type || interactionData.type === 'ChatInput')) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for chat input patterns
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'chatInput',
      id: fullCommandName,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleUserContextMenuCommand(
  tessen: Tessen,
  client: TessenClient,
  interaction: UserContextMenuInteractionWrapper['interaction']
) {
  const commandName = interaction.commandName;

  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: UserContextMenuInteractionWrapper = {
    type: 'userContextMenu',
    interaction,
    commandName,
    ...baseContext
  };

  // Check cached interactions for user context menu commands
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'User' && interactionData.name === commandName) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for user context menu handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'userContextMenu',
      id: commandName,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleMessageContextMenuCommand(
  tessen: Tessen,
  client: TessenClient,
  interaction: MessageContextMenuInteractionWrapper['interaction']
) {
  const commandName = interaction.commandName;

  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: MessageContextMenuInteractionWrapper = {
    type: 'messageContextMenu',
    interaction,
    commandName,
    ...baseContext
  };

  // Check cached interactions for message context menu commands
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'Message' && interactionData.name === commandName) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for message context menu handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'messageContextMenu',
      id: commandName,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleButtonInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: ButtonInteractionWrapper['interaction']
) {
  const { id: baseCustomId, data } = await parseCustomData(interaction.customId, tessen.events);
  
  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: ButtonInteractionWrapper = {
    type: 'button',
    interaction,
    customId: baseCustomId,
    data,
    ...baseContext
  };

  // Check cached interactions for button handlers registered via Pack
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'Button' && interactionData.id === baseCustomId) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for button handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'button',
      id: baseCustomId,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleStringSelectMenuInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: StringSelectMenuInteractionWrapper['interaction']
) {
  const { id: baseCustomId, data } = await parseCustomData(interaction.customId, tessen.events);
  
  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: StringSelectMenuInteractionWrapper = {
    type: 'stringSelectMenu',
    interaction,
    customId: baseCustomId,
    data,
    ...baseContext
  };

  // Check cached interactions for string select menu handlers registered via Pack
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'StringSelectMenu' && interactionData.id === baseCustomId) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for string select menu handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'stringSelectMenu',
      id: baseCustomId,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleUserSelectMenuInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: UserSelectMenuInteractionWrapper['interaction']
) {
  const { id: baseCustomId, data } = await parseCustomData(interaction.customId, tessen.events);
  
  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: UserSelectMenuInteractionWrapper = {
    type: 'userSelectMenu',
    interaction,
    customId: baseCustomId,
    data,
    ...baseContext
  };

  // Check cached interactions for user select menu handlers registered via Pack
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'UserSelectMenu' && interactionData.id === baseCustomId) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for user select menu handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'userSelectMenu',
      id: baseCustomId,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleRoleSelectMenuInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: RoleSelectMenuInteractionWrapper['interaction']
) {
  const { id: baseCustomId, data } = await parseCustomData(interaction.customId, tessen.events);
  
  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: RoleSelectMenuInteractionWrapper = {
    type: 'roleSelectMenu',
    interaction,
    customId: baseCustomId,
    data,
    ...baseContext
  };

  // Check cached interactions for role select menu handlers registered via Pack
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'RoleSelectMenu' && interactionData.id === baseCustomId) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for role select menu handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'roleSelectMenu',
      id: baseCustomId,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleChannelSelectMenuInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: ChannelSelectMenuInteractionWrapper['interaction']
) {
  const { id: baseCustomId, data } = await parseCustomData(interaction.customId, tessen.events);
  
  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: ChannelSelectMenuInteractionWrapper = {
    type: 'channelSelectMenu',
    interaction,
    customId: baseCustomId,
    data,
    ...baseContext
  };

  // Check cached interactions for channel select menu handlers registered via Pack
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'ChannelSelectMenu' && interactionData.id === baseCustomId) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for channel select menu handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'channelSelectMenu',
      id: baseCustomId,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleMentionableSelectMenuInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: MentionableSelectMenuInteractionWrapper['interaction']
) {
  const { id: baseCustomId, data } = await parseCustomData(interaction.customId, tessen.events);
  
  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: MentionableSelectMenuInteractionWrapper = {
    type: 'mentionableSelectMenu',
    interaction,
    customId: baseCustomId,
    data,
    ...baseContext
  };

  // Check cached interactions for mentionable select menu handlers registered via Pack
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'MentionableSelectMenu' && interactionData.id === baseCustomId) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for mentionable select menu handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'mentionableSelectMenu',
      id: baseCustomId,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}

async function handleModalSubmitInteraction(
  tessen: Tessen,
  client: TessenClient,
  interaction: ModalInteractionWrapper['interaction']
) {
  const { id: baseCustomId, data } = await parseCustomData(interaction.customId, tessen.events);
  
  const baseContext = createBaseInteractionContext(
    tessen,
    client,
    interaction.guild,
    interaction
  );

  const wrapper: ModalInteractionWrapper = {
    type: 'modal',
    interaction,
    customId: baseCustomId,
    data,
    ...baseContext
  };

  // Check cached interactions for modal handlers registered via Pack
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interactionData = cachedInteraction.data;
    
    if (interactionData.type === 'Modal' && interactionData.id === baseCustomId) {
      await interactionData.handle(wrapper);
      return;
    }
  }

  // Check inspectors for modal handlers
  for (const [key, cachedInspector] of tessen.cache.inspectors) {
    const inspector = cachedInspector.data;
    const result = await inspector.emit({
      type: 'modal',
      id: baseCustomId,
      ctx: wrapper
    });
    if (result !== undefined) return;
  }
}
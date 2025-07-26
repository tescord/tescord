import { Tessen, TessenClient } from "$lib/Tessen";
import {
  ChannelType,
  InteractionContextType,
  PermissionFlags,
  ApplicationCommandDataResolvable,
  ApplicationCommandOptionData,
  PermissionResolvable,
  PermissionFlagsBits
} from "discord.js";
import { REST } from "@discordjs/rest";
import {
  Routes,
  RESTGetAPIUserResult,
  RESTPutAPIApplicationCommandsJSONBody,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { SlashCommand, SlashCommandOption } from "$types/SlashCommand";
import {
  UserContextMenuCommand,
  MessageContextMenuCommand,
} from "$types/Interactions";
import {
  InteractionLocaleData,
  CommandInteractionLocale,
  ContextMenuLocale,
} from "$lib/Locale";
import { writeFileSync } from "fs";

export const DISCORD_LOCALES = [
  "id",
  "da",
  "de",
  "en-GB",
  "en-US",
  "es-ES",
  "es-419",
  "fr",
  "hr",
  "it",
  "lt",
  "hu",
  "nl",
  "no",
  "pl",
  "pt-BR",
  "ro",
  "fi",
  "sv-SE",
  "vi",
  "tr",
  "cs",
  "el",
  "bg",
  "ru",
  "uk",
  "hi",
  "th",
  "zh-CN",
  "ja",
  "zh-TW",
  "ko",
] as const;

// Valid channel types for application commands
const VALID_COMMAND_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildVoice,
  ChannelType.GuildCategory,
  ChannelType.GuildAnnouncement,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.GuildStageVoice,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
] as const;

type ValidCommandChannelType = (typeof VALID_COMMAND_CHANNEL_TYPES)[number];

// Convert channel type strings to Discord.js enum values
function convertChannelTypes(
  channelTypes?: (keyof typeof ChannelType)[],
): readonly ValidCommandChannelType[] | undefined {
  if (!channelTypes) return undefined;

  const validTypes = channelTypes
    .map((type) => ChannelType[type])
    .filter((type): type is ValidCommandChannelType =>
      VALID_COMMAND_CHANNEL_TYPES.includes(type as ValidCommandChannelType),
    );

  return validTypes.length > 0
    ? (validTypes as readonly ValidCommandChannelType[])
    : undefined;
}

// Convert context types to Discord.js enum values
function convertContextTypes(
  contexts?: (keyof typeof InteractionContextType)[],
): InteractionContextType[] | undefined {
  if (!contexts) return undefined;
  return contexts
    .map((context) => (typeof context === "string" ? InteractionContextType[context] : context))
    .filter((context) => typeof context === "number" && context >= 0) as InteractionContextType[];
}

// Convert permission flags to Discord.js format
function convertPermissions(
  permissions?: (keyof PermissionFlags)[],
): string | null | undefined {
  if (!permissions || permissions.length === 0) return null;
  
  // Convert permission strings to PermissionFlagsBits and combine using bitwise OR
  let combinedPermissions = 0n;
  
  for (const permission of permissions) {
    const permissionBit = PermissionFlagsBits[permission];
    if (permissionBit !== undefined) {
      combinedPermissions |= permissionBit;
    }
  }
  
  // Convert BigInt to string for Discord API
  return combinedPermissions.toString();
}

// Convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Convert object keys from camelCase to snake_case recursively
function convertToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertToSnakeCase(item));
  }

  if (typeof obj === "object") {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      converted[snakeKey] = convertToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

// Type for our command structure that matches Discord API expectations
interface TessenApplicationCommand {
  name: string;
  type: ApplicationCommandType.ChatInput;
  description: string;
  options?: ApplicationCommandOptionData[];
  defaultMemberPermissions?: string | null;
  contexts?: InteractionContextType[];
  nsfw?: boolean;
}

// Helper function to create properly typed command option
function createCommandOption(
  optionName: string,
  option: SlashCommandOption,
): ApplicationCommandOptionData {
  const baseOption = {
    name: optionName,
    description: option.description,
    required: option.required || false,
  };

  switch (option.type) {
    case "String":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.String,
        ...(option.minLength !== undefined && { minLength: option.minLength }),
        ...(option.maxLength !== undefined && { maxLength: option.maxLength }),
        ...(option.choices && {
          choices: Object.entries(option.choices).map(([key, name]) => ({
            name: String(name),
            value: String(key), // Key is the value in Tessen
          })),
        }),
        ...(option.autoComplete && { autocomplete: true }),
      };

    case "Integer":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.Integer,
        ...(option.minValue !== undefined && { minValue: option.minValue }),
        ...(option.maxValue !== undefined && { maxValue: option.maxValue }),
        ...(option.choices && {
          choices: Object.entries(option.choices).map(([key, name]) => ({
            name: String(name),
            value: Number(key), // Key is the value in Tessen
          })),
        }),
        ...(option.autoComplete && { autocomplete: true }),
      };

    case "Number":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.Number,
        ...(option.minValue !== undefined && { minValue: option.minValue }),
        ...(option.maxValue !== undefined && { maxValue: option.maxValue }),
        ...(option.choices && {
          choices: Object.entries(option.choices).map(([key, name]) => ({
            name: String(name),
            value: Number(key), // Key is the value in Tessen
          })),
        }),
        ...(option.autoComplete && { autocomplete: true }),
      };

    case "Boolean":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.Boolean,
      };

    case "User":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.User,
      };

    case "Channel":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.Channel,
        ...(option.channelTypes && {
          channelTypes: convertChannelTypes(option.channelTypes),
        }),
      };

    case "Role":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.Role,
      };

    case "Mentionable":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.Mentionable,
      };

    case "Attachment":
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.Attachment,
      };

    default:
      // Exhaustive check to ensure we handle all cases
      const _exhaustiveCheck: never = option;
      return {
        ...baseOption,
        type: ApplicationCommandOptionType.String,
      };
  }
}

// Helper function to get Discord locales from our internal format
function getDiscordLocales(internalLocale: string): string[] {
  // Find all Discord locales that start with our internal locale
  return DISCORD_LOCALES.filter(
    (discordLocale) =>
      discordLocale.startsWith(internalLocale + "-") ||
      discordLocale === internalLocale,
  );
}

// Helper function to get localized data for interactions
function getLocalizedInteractionData(
  tessen: Tessen,
  interactionId: string,
  locale: string,
): CommandInteractionLocale | undefined {
  const interactionLocales = tessen.locales.interaction.get(locale);
  if (!interactionLocales) return undefined;

  // Look for the interaction by ID and ensure proper typing
  const data = interactionLocales[interactionId];
  if (!data || typeof data !== "object") return undefined;

  // Type guard to ensure it's a CommandInteractionLocale
  if ("names" in data || "description" in data || "options" in data) {
    return data as CommandInteractionLocale;
  }

  return undefined;
}

// Helper function to get localized name for a specific command combination
function getLocalizedCommandName(
  tessen: Tessen,
  interactionId: string,
  commandName: string,
  locale: string,
): string | undefined {
  const localizedData = getLocalizedInteractionData(
    tessen,
    interactionId,
    locale,
  );
  if (!localizedData) return undefined;

  // Check names property for word-by-word translations
  if (localizedData.names && typeof localizedData.names === "object") {
    // Split the command into words and translate each word
    const words = commandName.split(" ");
    const translatedWords: string[] = [];

    for (const word of words) {
      // Look for translation of this word in the names mapping
      const translatedWord = localizedData.names[word];
      if (translatedWord) {
        translatedWords.push(translatedWord);
      } else {
        // If no translation found, use original word
        translatedWords.push(word);
      }
    }

    // Join translated words back into a phrase
    return translatedWords.join(" ");
  }

  return undefined;
}

// Helper function to get localized name parts for subcommands/groups
function getLocalizedNameParts(
  tessen: Tessen,
  interactionId: string,
  originalCombination: string,
  locale: string,
): { base?: string; group?: string; subcommand?: string } | undefined {
  const localizedData = getLocalizedInteractionData(
    tessen,
    interactionId,
    locale,
  );
  if (
    !localizedData ||
    !localizedData.names ||
    typeof localizedData.names !== "object"
  ) {
    return undefined;
  }

  const originalParts = originalCombination.split(" ");
  const result: { base?: string; group?: string; subcommand?: string } = {};

  // Translate each part individually
  if (originalParts[0]) {
    result.base = localizedData.names[originalParts[0]] || originalParts[0];
  }

  if (originalParts.length >= 2 && originalParts[1]) {
    result.group = localizedData.names[originalParts[1]] || originalParts[1];
  }

  if (originalParts.length >= 3 && originalParts[2]) {
    result.subcommand =
      localizedData.names[originalParts[2]] || originalParts[2];
  }

  return result;
}

// Helper function to localize command names and descriptions
function localizeCommand(
  tessen: Tessen,
  command: TessenApplicationCommand,
  interactionId: string,
  commandName: string,
): Record<string, { name?: string; description?: string }> {
  const localizations: Record<string, { name?: string; description?: string }> =
    {};

  // Process each available locale
  for (const [locale, _] of tessen.locales.interaction) {
    const localizedData = getLocalizedInteractionData(
      tessen,
      interactionId,
      locale,
    );
    if (localizedData) {
      const discordLocales = getDiscordLocales(locale);

      // Apply the same localization to all Discord locales for this language
      for (const discordLocale of discordLocales) {
        if (!localizations[discordLocale]) {
          localizations[discordLocale] = {};
        }

        // For slash commands, try to get the localized name for this specific command combination
        const localizedName = getLocalizedCommandName(
          tessen,
          interactionId,
          commandName,
          locale,
        );
        if (localizedName) {
          localizations[discordLocale].name = localizedName;
        }

        if (localizedData.description) {
          localizations[discordLocale].description = localizedData.description;
        }
      }
    }
  }

  return localizations;
}

// Helper function to build localization maps for subcommand options (non-nested)
function buildSubcommandOptionLocalizations(
  tessen: Tessen,
  options: readonly ApplicationCommandOptionData[],
  interactionId: string,
): ApplicationCommandOptionData[] {
  return options.map((option) => {
    const nameLocalizations: Record<string, string> = {};
    const descriptionLocalizations: Record<string, string> = {};
    const choiceLocalizations: Record<
      string | number,
      Record<string, string>
    > = {};

    // Collect localizations for each available locale
    for (const [locale, _] of tessen.locales.interaction) {
      const localizedData = getLocalizedInteractionData(
        tessen,
        interactionId,
        locale,
      );
      if (localizedData?.options?.[option.name]) {
        const optionData = localizedData.options[option.name];
        const discordLocales = getDiscordLocales(locale);

        // Apply the same localization to all Discord locales for this language
        for (const discordLocale of discordLocales) {
          // Option name localization: the option.name IS the key from Tessen's options object
          if (optionData.name) {
            nameLocalizations[discordLocale] = optionData.name;
          }

          if (optionData.description) {
            descriptionLocalizations[discordLocale] = optionData.description;
          }

          // Handle choice localizations: choice.value is the key from Tessen's choices object
          if (optionData.choices && "choices" in option && option.choices) {
            for (const choice of option.choices) {
              // choice.value is the key from our original choices object in Tessen
              const choiceKey = String(choice.value);
              const localizedChoiceName = optionData.choices[choiceKey];
              if (localizedChoiceName) {
                if (!choiceLocalizations[choice.value]) {
                  choiceLocalizations[choice.value] = {};
                }
                choiceLocalizations[choice.value][discordLocale] =
                  localizedChoiceName;
              }
            }
          }
        }
      }
    }

    // Apply localizations to option
    const localizedOption = { ...option };

    // Apply name localizations (option name localization)
    if (Object.keys(nameLocalizations).length > 0) {
      (localizedOption as any).nameLocalizations = nameLocalizations;
    }

    if (Object.keys(descriptionLocalizations).length > 0) {
      (localizedOption as any).descriptionLocalizations =
        descriptionLocalizations;
    }

    // Apply choice localizations
    if (
      "choices" in localizedOption &&
      localizedOption.choices &&
      Object.keys(choiceLocalizations).length > 0
    ) {
      if (localizedOption.type === ApplicationCommandOptionType.String) {
        (localizedOption as any).choices = localizedOption.choices.map(
          (choice) => {
            const choiceLocalization = choiceLocalizations[choice.value];
            if (
              choiceLocalization &&
              Object.keys(choiceLocalization).length > 0
            ) {
              return {
                name: choice.name,
                value: choice.value as string,
                nameLocalizations: choiceLocalization,
              };
            }
            return choice;
          },
        );
      } else if (
        localizedOption.type === ApplicationCommandOptionType.Integer ||
        localizedOption.type === ApplicationCommandOptionType.Number
      ) {
        (localizedOption as any).choices = localizedOption.choices.map(
          (choice) => {
            const choiceLocalization = choiceLocalizations[choice.value];
            if (
              choiceLocalization &&
              Object.keys(choiceLocalization).length > 0
            ) {
              return {
                name: choice.name,
                value: choice.value as number,
                nameLocalizations: choiceLocalization,
              };
            }
            return choice;
          },
        );
      }
    }

    return localizedOption;
  });
}

// Helper function to build localization maps for options
function buildOptionLocalizations(
  tessen: Tessen,
  options: readonly ApplicationCommandOptionData[],
  interactionId: string,
): ApplicationCommandOptionData[] {
  return options.map((option) => {
    // Handle subcommand groups separately
    if (
      option.type === ApplicationCommandOptionType.SubcommandGroup &&
      "options" in option &&
      option.options
    ) {
      const subcommandGroupOption = { ...option };

      // Apply name and description localizations to the subcommand group itself
      const nameLocalizations: Record<string, string> = {};
      const descriptionLocalizations: Record<string, string> = {};

      for (const [locale, _] of tessen.locales.interaction) {
        const localizedData = getLocalizedInteractionData(
          tessen,
          interactionId,
          locale,
        );
        if (localizedData?.options?.[option.name]) {
          const optionData = localizedData.options[option.name];
          const discordLocales = getDiscordLocales(locale);

          // Apply the same localization to all Discord locales for this language
          for (const discordLocale of discordLocales) {
            if (optionData.name) {
              nameLocalizations[discordLocale] = optionData.name;
            }

            if (optionData.description) {
              descriptionLocalizations[discordLocale] = optionData.description;
            }
          }
        }
      }

      if (Object.keys(nameLocalizations).length > 0) {
        (subcommandGroupOption as any).nameLocalizations = nameLocalizations;
      }

      if (Object.keys(descriptionLocalizations).length > 0) {
        (subcommandGroupOption as any).descriptionLocalizations =
          descriptionLocalizations;
      }

      // Recursively handle subcommands within the group - convert readonly to mutable
      const processedSubcommands = buildOptionLocalizations(
        tessen,
        option.options as readonly ApplicationCommandOptionData[],
        interactionId,
      );

      (subcommandGroupOption as any).options = processedSubcommands;

      return subcommandGroupOption;
    }

    // Handle subcommands
    if (
      option.type === ApplicationCommandOptionType.Subcommand &&
      "options" in option &&
      option.options
    ) {
      const subcommandOption = { ...option };

      // Apply name and description localizations to the subcommand itself
      const nameLocalizations: Record<string, string> = {};
      const descriptionLocalizations: Record<string, string> = {};

      for (const [locale, _] of tessen.locales.interaction) {
        const localizedData = getLocalizedInteractionData(
          tessen,
          interactionId,
          locale,
        );
        if (localizedData?.options?.[option.name]) {
          const optionData = localizedData.options[option.name];
          const discordLocales = getDiscordLocales(locale);

          // Apply the same localization to all Discord locales for this language
          for (const discordLocale of discordLocales) {
            if (optionData.name) {
              nameLocalizations[discordLocale] = optionData.name;
            }

            if (optionData.description) {
              descriptionLocalizations[discordLocale] = optionData.description;
            }
          }
        }
      }

      if (Object.keys(nameLocalizations).length > 0) {
        (subcommandOption as any).nameLocalizations = nameLocalizations;
      }

      if (Object.keys(descriptionLocalizations).length > 0) {
        (subcommandOption as any).descriptionLocalizations =
          descriptionLocalizations;
      }

      // Handle the subcommand's options (these are regular options, not subcommands)
      const processedOptions = buildSubcommandOptionLocalizations(
        tessen,
        option.options as readonly ApplicationCommandOptionData[],
        interactionId,
      );

      (subcommandOption as any).options = processedOptions;

      return subcommandOption;
    }

    // Handle regular options (non-subcommand, non-subcommand-group)
    return buildSubcommandOptionLocalizations(
      tessen,
      [option],
      interactionId,
    )[0];
  });
}

export async function publishInteractions(
  tessen: Tessen,
  guildId?: string,
) {
  // Group interactions by target client namespace
  const clientInteractions = new Map<string, any[]>();

  // Initialize all clients with empty arrays
  for (const tessenClient of tessen.clients.values()) {
    clientInteractions.set(tessenClient.id, []);
  }

  // Get first client as default
  const firstClient = tessen.clients.first();
  const defaultClientId = firstClient?.id;

  if (!defaultClientId) {
    tessen.events.emit("tessen:interactionsPublishError", {
      clientId: "unknown",
      error: new Error("No clients available for publishing interactions"),
    });
    return;
  }

  // First, collect all slash commands and group them by base command name and client
  const allSlashCommands: Map<
    string,
    Map<string, { command: SlashCommand; combinations: string[] }[]>
  > = new Map();

  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interaction = cachedInteraction.data;

    if ("nameCombinations" in interaction && interaction.type === "ChatInput") {
      const slashCommand = interaction as SlashCommand;

      // Determine target client
      const targetClientId = slashCommand.clientId || defaultClientId;
      if (!clientInteractions.has(targetClientId)) {
        console.warn(
          `Client '${targetClientId}' not found for interaction '${slashCommand.id}', using default client '${defaultClientId}'`,
        );
        clientInteractions.set(
          defaultClientId,
          clientInteractions.get(defaultClientId) || [],
        );
      }

      const actualClientId = clientInteractions.has(targetClientId)
        ? targetClientId
        : defaultClientId;

      // Initialize client map if needed
      if (!allSlashCommands.has(actualClientId)) {
        allSlashCommands.set(actualClientId, new Map());
      }
      const clientCommands = allSlashCommands.get(actualClientId)!;

      // Group combinations by base command name
      const commandGroups = new Map<string, string[]>();

      for (const combination of slashCommand.nameCombinations) {
        const nameParts = combination.split(" ");
        const baseCommand = nameParts[0];

        if (!commandGroups.has(baseCommand)) {
          commandGroups.set(baseCommand, []);
        }
        commandGroups.get(baseCommand)!.push(combination);
      }

      // Add each base command group to the client's commands
      for (const [baseCommandName, combinations] of commandGroups) {
        if (!clientCommands.has(baseCommandName)) {
          clientCommands.set(baseCommandName, []);
        }
        clientCommands.get(baseCommandName)!.push({
          command: slashCommand,
          combinations: combinations,
        });
      }
    }
  }

  // Now process the grouped commands
  for (const [clientId, baseCommandGroups] of allSlashCommands) {
    const targetCommands = clientInteractions.get(clientId)!;

    for (const [baseCommandName, commandEntries] of baseCommandGroups) {
      // Use the first command's properties as base for the merged command
      const firstCommand = commandEntries[0].command;

      // Find the best description (first non-empty one or fallback to first)
      let bestDescription = firstCommand.description;
      for (const entry of commandEntries) {
        if (entry.command.description && entry.command.description.trim()) {
          bestDescription = entry.command.description;
          break;
        }
      }

      const command: TessenApplicationCommand = {
        name: baseCommandName,
        description: bestDescription,
        type: ApplicationCommandType.ChatInput,
        options: [],
        defaultMemberPermissions: convertPermissions(
          firstCommand.defaultMemberPermissions,
        ),
        contexts: convertContextTypes(firstCommand.contexts),
        nsfw: firstCommand.nsfw || false,
      };

      // Collect all combinations from all commands with the same base name
      const allCombinations: string[] = [];
      const combinationToCommandMap = new Map<string, SlashCommand>();

      for (const entry of commandEntries) {
        for (const combination of entry.combinations) {
          allCombinations.push(combination);
          combinationToCommandMap.set(combination, entry.command);
        }
      }

      // Group all combinations by structure across all merged commands
      const subcommandGroups = new Map<
        string,
        { combination: string; command: SlashCommand }[]
      >();
      const subcommands: { combination: string; command: SlashCommand }[] = [];
      let hasTopLevelCommand = false;
      let topLevelCommand: SlashCommand | undefined;

      for (const combination of allCombinations) {
        const nameParts = combination.split(" ");
        const sourceCommand = combinationToCommandMap.get(combination)!;

        if (nameParts.length === 1) {
          // Top-level command
          hasTopLevelCommand = true;
          topLevelCommand = sourceCommand;
        } else if (nameParts.length === 2) {
          // Subcommand
          subcommands.push({ combination, command: sourceCommand });
        } else if (nameParts.length >= 3) {
          // Subcommand group
          const groupName = nameParts[1];
          if (!subcommandGroups.has(groupName)) {
            subcommandGroups.set(groupName, []);
          }
          subcommandGroups
            .get(groupName)!
            .push({ combination, command: sourceCommand });
        }
      }

      // Add top-level options if this is a simple command
      if (
        hasTopLevelCommand &&
        subcommands.length === 0 &&
        subcommandGroups.size === 0 &&
        topLevelCommand
      ) {
        if (topLevelCommand.options) {
          for (const [optionName, option] of Object.entries(
            topLevelCommand.options,
          )) {
            const commandOption = createCommandOption(optionName, option);
            command.options!.push(commandOption);
          }
        }
      }

      // Add subcommands (merge by subcommand name if duplicates exist)
      const subcommandMap = new Map<
        string,
        { combination: string; command: SlashCommand }
      >();
      for (const subcommandData of subcommands) {
        const nameParts = subcommandData.combination.split(" ");
        const subcommandName = nameParts[1];

        // Use the first occurrence of each subcommand name
        if (!subcommandMap.has(subcommandName)) {
          subcommandMap.set(subcommandName, subcommandData);
        }
      }

      for (const [subcommandName, subcommandData] of subcommandMap) {
        const { combination: subcommandCombination, command: sourceCommand } =
          subcommandData;

        const subcommandOption: ApplicationCommandOptionData = {
          name: subcommandName,
          description: sourceCommand.description,
          type: ApplicationCommandOptionType.Subcommand,
          options: [],
        };

        // Add localization for subcommand name and description
        const subcommandNameLocalizations: Record<string, string> = {};
        const subcommandDescriptionLocalizations: Record<string, string> = {};
        for (const [locale, _] of tessen.locales.interaction) {
          const localizedParts = getLocalizedNameParts(
            tessen,
            sourceCommand.id,
            subcommandCombination,
            locale,
          );
          if (localizedParts?.group) {
            // For 2-part commands, the second part (group) is the subcommand name
            const discordLocales = getDiscordLocales(locale);
            for (const discordLocale of discordLocales) {
              subcommandNameLocalizations[discordLocale] = localizedParts.group;
            }
          }

          // Get description localization from main command data for this combination
          const localizedData = getLocalizedInteractionData(
            tessen,
            sourceCommand.id,
            locale,
          );
          if (localizedData?.description) {
            const discordLocales = getDiscordLocales(locale);
            for (const discordLocale of discordLocales) {
              subcommandDescriptionLocalizations[discordLocale] =
                localizedData.description;
            }
          }
        }

        if (Object.keys(subcommandNameLocalizations).length > 0) {
          (subcommandOption as any).nameLocalizations =
            subcommandNameLocalizations;
        }

        if (Object.keys(subcommandDescriptionLocalizations).length > 0) {
          (subcommandOption as any).descriptionLocalizations =
            subcommandDescriptionLocalizations;
        }

        // Add options to subcommand
        if (sourceCommand.options) {
          for (const [optionName, option] of Object.entries(
            sourceCommand.options,
          )) {
            const commandOption = createCommandOption(optionName, option);
            (subcommandOption.options as ApplicationCommandOptionData[]).push(
              commandOption,
            );
          }
        }

        command.options!.push(subcommandOption);
      }

      // Add subcommand groups (merge subcommands within groups)
      for (const [groupName, groupCombinationsData] of subcommandGroups) {
        // Use the first command's data for the group
        const firstGroupCommand = groupCombinationsData[0].command;

        const subcommandGroupOption: ApplicationCommandOptionData = {
          name: groupName,
          description: firstGroupCommand.description,
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [],
        };

        // Add localization for subcommand group name and description
        const groupNameLocalizations: Record<string, string> = {};
        const groupDescriptionLocalizations: Record<string, string> = {};
        // Use the first combination in the group to get the group name localization
        const firstCombination = groupCombinationsData[0].combination;
        for (const [locale, _] of tessen.locales.interaction) {
          const localizedParts = getLocalizedNameParts(
            tessen,
            firstGroupCommand.id,
            firstCombination,
            locale,
          );
          if (localizedParts?.group) {
            // For 3+ part commands, the second part is the group name
            const discordLocales = getDiscordLocales(locale);
            for (const discordLocale of discordLocales) {
              groupNameLocalizations[discordLocale] = localizedParts.group;
            }
          }

          // Get description localization from main command data
          const localizedData = getLocalizedInteractionData(
            tessen,
            firstGroupCommand.id,
            locale,
          );
          if (localizedData?.description) {
            const discordLocales = getDiscordLocales(locale);
            for (const discordLocale of discordLocales) {
              groupDescriptionLocalizations[discordLocale] =
                localizedData.description;
            }
          }
        }

        if (Object.keys(groupNameLocalizations).length > 0) {
          (subcommandGroupOption as any).nameLocalizations =
            groupNameLocalizations;
        }

        if (Object.keys(groupDescriptionLocalizations).length > 0) {
          (subcommandGroupOption as any).descriptionLocalizations =
            groupDescriptionLocalizations;
        }

        // Merge subcommands within the group (avoid duplicates by subcommand name)
        const groupSubcommandMap = new Map<
          string,
          { combination: string; command: SlashCommand }
        >();
        for (const groupData of groupCombinationsData) {
          const nameParts = groupData.combination.split(" ");
          const subcommandName = nameParts[2];

          // Use the first occurrence of each subcommand name within the group
          if (!groupSubcommandMap.has(subcommandName)) {
            groupSubcommandMap.set(subcommandName, groupData);
          }
        }

        for (const [subcommandName, subcommandData] of groupSubcommandMap) {
          const { combination: groupCombination, command: sourceCommand } =
            subcommandData;

          const subcommandOption: ApplicationCommandOptionData = {
            name: subcommandName,
            description: sourceCommand.description,
            type: ApplicationCommandOptionType.Subcommand,
            options: [],
          };

          // Add localization for subcommand name and description within group
          const subcommandNameLocalizations: Record<string, string> = {};
          const subcommandDescriptionLocalizations: Record<string, string> = {};
          for (const [locale, _] of tessen.locales.interaction) {
            const localizedParts = getLocalizedNameParts(
              tessen,
              sourceCommand.id,
              groupCombination,
              locale,
            );
            if (localizedParts?.subcommand) {
              // For 3+ part commands, the third part is the subcommand name
              const discordLocales = getDiscordLocales(locale);
              for (const discordLocale of discordLocales) {
                subcommandNameLocalizations[discordLocale] =
                  localizedParts.subcommand;
              }
            }

            // Get description localization from main command data for this combination
            const localizedData = getLocalizedInteractionData(
              tessen,
              sourceCommand.id,
              locale,
            );
            if (localizedData?.description) {
              const discordLocales = getDiscordLocales(locale);
              for (const discordLocale of discordLocales) {
                subcommandDescriptionLocalizations[discordLocale] =
                  localizedData.description;
              }
            }
          }

          if (Object.keys(subcommandNameLocalizations).length > 0) {
            (subcommandOption as any).nameLocalizations =
              subcommandNameLocalizations;
          }

          if (Object.keys(subcommandDescriptionLocalizations).length > 0) {
            (subcommandOption as any).descriptionLocalizations =
              subcommandDescriptionLocalizations;
          }

          // Add options to subcommand
          if (sourceCommand.options) {
            for (const [optionName, option] of Object.entries(
              sourceCommand.options,
            )) {
              const commandOption = createCommandOption(optionName, option);
              (subcommandOption.options as ApplicationCommandOptionData[]).push(
                commandOption,
              );
            }
          }

          (
            subcommandGroupOption.options as ApplicationCommandOptionData[]
          ).push(subcommandOption);
        }

        command.options!.push(subcommandGroupOption);
      }

      // Apply localizations for the base command using the first command's ID
      const firstCommandId = firstCommand.id;
      const commandLocalizations = localizeCommand(
        tessen,
        command,
        firstCommandId,
        baseCommandName,
      );

      // Apply name and description localizations
      const nameLocalizations: Record<string, string> = {};
      const descriptionLocalizations: Record<string, string> = {};

      // Add base command name localizations - try all command entries for localization
      for (const [locale, _] of tessen.locales.interaction) {
        let baseLocalization: string | undefined;

        // Try to get localization from any command entry
        for (const entry of commandEntries) {
          for (const combination of entry.combinations) {
            const localizedParts = getLocalizedNameParts(
              tessen,
              entry.command.id,
              combination,
              locale,
            );
            if (localizedParts?.base) {
              baseLocalization = localizedParts.base;
              break;
            }
          }
          if (baseLocalization) break;
        }

        if (baseLocalization) {
          const discordLocales = getDiscordLocales(locale);
          for (const discordLocale of discordLocales) {
            nameLocalizations[discordLocale] = baseLocalization;
          }
        }
      }

      for (const [discordLocale, localizationData] of Object.entries(
        commandLocalizations,
      )) {
        if (localizationData.description) {
          descriptionLocalizations[discordLocale] =
            localizationData.description;
        }
      }

      // Add localizations to command if any exist
      if (Object.keys(nameLocalizations).length > 0) {
        (command as any).nameLocalizations = nameLocalizations;
      }
      if (Object.keys(descriptionLocalizations).length > 0) {
        (command as any).descriptionLocalizations = descriptionLocalizations;
      }

      // Apply option localizations using the first command's interaction ID
      if (command.options && command.options.length > 0) {
        command.options = buildOptionLocalizations(
          tessen,
          command.options as readonly ApplicationCommandOptionData[],
          firstCommandId,
        );
      }

      targetCommands.push(command);
    }
  }

  // Process context menu commands
  for (const [key, cachedInteraction] of tessen.cache.interactions) {
    const interaction = cachedInteraction.data;

    // Process user context menu commands with localization
    if (interaction.type === "User") {
      const userContextMenu = interaction as UserContextMenuCommand;

      // Determine target client
      const targetClientId = userContextMenu.clientId || defaultClientId;
      const targetCommands =
        clientInteractions.get(targetClientId) ||
        clientInteractions.get(defaultClientId)!;

      const command: ApplicationCommandDataResolvable & {
        nameLocalizations?: Record<string, string>;
      } = {
        name: userContextMenu.name,
        type: ApplicationCommandType.User,
      };

      // Add localizations for context menu using interaction ID
      const nameLocalizations: Record<string, string> = {};
      for (const [locale, _] of tessen.locales.interaction) {
        const localizedData = getLocalizedInteractionData(
          tessen,
          userContextMenu.id,
          locale,
        );
        if (localizedData && "name" in localizedData) {
          // For context menus, still use name field since they don't have combinations
          const contextData = localizedData as ContextMenuLocale;
          if (contextData.name) {
            const discordLocales = getDiscordLocales(locale);

            // Apply the same localization to all Discord locales for this language
            for (const discordLocale of discordLocales) {
              nameLocalizations[discordLocale] = contextData.name;
            }
          }
        }
      }

      if (Object.keys(nameLocalizations).length > 0) {
        command.nameLocalizations = nameLocalizations;
      }

      targetCommands.push(command);
    }

    // Process message context menu commands with localization
    if (interaction.type === "Message") {
      const messageContextMenu = interaction as MessageContextMenuCommand;

      // Determine target client
      const targetClientId = messageContextMenu.clientId || defaultClientId;
      const targetCommands =
        clientInteractions.get(targetClientId) ||
        clientInteractions.get(defaultClientId)!;

      const command: ApplicationCommandDataResolvable & {
        nameLocalizations?: Record<string, string>;
      } = {
        name: messageContextMenu.name,
        type: ApplicationCommandType.Message,
      };

      // Add localizations for context menu using interaction ID
      const nameLocalizations: Record<string, string> = {};
      for (const [locale, _] of tessen.locales.interaction) {
        const localizedData = getLocalizedInteractionData(
          tessen,
          messageContextMenu.id,
          locale,
        );
        if (localizedData && "name" in localizedData) {
          // For context menus, still use name field since they don't have combinations
          const contextData = localizedData as ContextMenuLocale;
          if (contextData.name) {
            const discordLocales = getDiscordLocales(locale);

            // Apply the same localization to all Discord locales for this language
            for (const discordLocale of discordLocales) {
              nameLocalizations[discordLocale] = contextData.name;
            }
          }
        }
      }

      if (Object.keys(nameLocalizations).length > 0) {
        command.nameLocalizations = nameLocalizations;
      }

      targetCommands.push(command);
    }
  }

  // Prepare body object with commands grouped by client namespace
  const body: Record<string, any[]> = {};
  for (const [clientId, commands] of clientInteractions) {
    body[clientId] = commands;
  }

  // Collect all clients for publishing
  const clients = Array.from(tessen.clients.values()).map((tessenClient: TessenClient) => ({
    token: tessenClient.client.token!,
    namespace: tessenClient.id,
  }));

  // Determine publish type
  const publishType = guildId ? "Guild" : "Global";

  // Register commands with Discord API for each client
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const rest = new REST({ version: "10" });
    rest.setToken(client.token);

    try {
      const me: RESTGetAPIUserResult = (await rest.get(Routes.user())) as any;

      switch (publishType) {
        case "Guild": {
          await rest.put(Routes.applicationGuildCommands(me.id, guildId!), {
            body: convertToSnakeCase(body[client.namespace] || []),
          });

          tessen.events.emit("tessen:interactionsPublished", {
            clientId: client.namespace,
            count: (body[client.namespace] || []).length,
          });
          break;
        }
        case "Global": {
          await rest.put(Routes.applicationCommands(me.id), {
            body: convertToSnakeCase(body[client.namespace] || []),
          });

          tessen.events.emit("tessen:interactionsPublished", {
            clientId: client.namespace,
            count: (body[client.namespace] || []).length,
          });
          break;
        }
      }
    } catch (error) {
      console.error(
        `Failed to publish interactions for client '${client.namespace}':`,
        error,
      );
      tessen.events.emit("tessen:interactionsPublishError", {
        clientId: client.namespace,
        error: error as Error,
      });
    }
  }
}

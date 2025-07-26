import { AutocompleteInteraction, ChannelType, InteractionContextType, PermissionFlags } from "discord.js";
import { ChatInputInteractionWrapper } from "./Interactions";

type StringToTuple<
  S extends string,
  R extends any[] = []
> = S extends `${infer _}${infer Rest}`
  ? StringToTuple<Rest, [unknown, ...R]>
  : R;

type StringLength<S extends string> = StringToTuple<S>["length"];

type ValidCombination<S extends string> = StringLength<S> extends infer L
  ? L extends number
    ? L extends 0
      ? never
      : S
    : never
  : never;

export type SlashCommandName<S extends string> =
  S extends `${infer _} ${infer _} ${infer _} ${infer _}`
    ? never
  : S extends `${infer W1} ${infer W2} ${infer W3}`
    ? W1 extends string
      ? W2 extends string
        ? W3 extends string
          ? ValidCombination<W1> extends never
            ? never
            : ValidCombination<W2> extends never
              ? never
              : ValidCombination<W3> extends never
                ? never
                : S
          : never
        : never
      : never
    : S extends `${infer W1} ${infer W2}`
      ? W1 extends string
        ? W2 extends string
          ? ValidCombination<W1> extends never
            ? never
            : ValidCombination<W2> extends never
              ? never
              : S
          : never
        : never
      : ValidCombination<S> extends never
        ? never
        : S

export type SlashCommandType = 'ChatInput' | 'User' | 'Message';

// Discord.js Application Command Option Types (excluding Subcommand and SubcommandGroup)
export type SlashCommandOptionType = 
  | 'String'
  | 'Integer' 
  | 'Number'
  | 'Boolean'
  | 'User'
  | 'Channel'
  | 'Role'
  | 'Mentionable'
  | 'Attachment';

// Base option interface
export interface BaseSlashCommandOption {
  description: string;
  required?: boolean;
}

// Option choice interface - now using object notation
export type SlashCommandOptionChoices<T = string | number> = Record<T extends string ? string : number, string>;

// Autocomplete context for dynamic options
export interface AutocompleteContext {
  value: string;
  focused: boolean;
  interaction: AutocompleteInteraction; // The autocomplete interaction
}

// Generic type for choices or autocomplete functionality
export type OptionChoicesOrAutocomplete<T extends string | number> = 
  | { choices: SlashCommandOptionChoices<T>; autoComplete?: never; }
  | { autoComplete: (ctx: AutocompleteContext) => Promise<SlashCommandOptionChoices<T>> | SlashCommandOptionChoices<T>; choices?: never; }
  | { choices?: never; autoComplete?: never; };

// String option - using generic choices/autocomplete type
export type StringSlashCommandOption = BaseSlashCommandOption & {
  type: 'String';
  minLength?: number;
  maxLength?: number;
} & OptionChoicesOrAutocomplete<string>;

// Integer option - using generic choices/autocomplete type
export type IntegerSlashCommandOption = BaseSlashCommandOption & {
  type: 'Integer';
  minValue?: number;
  maxValue?: number;
} & OptionChoicesOrAutocomplete<number>;

// Number option - using generic choices/autocomplete type
export type NumberSlashCommandOption = BaseSlashCommandOption & {
  type: 'Number';
  minValue?: number;
  maxValue?: number;
} & OptionChoicesOrAutocomplete<number>;

// Boolean option
export interface BooleanSlashCommandOption extends BaseSlashCommandOption {
  type: 'Boolean';
}

// User option
export interface UserSlashCommandOption extends BaseSlashCommandOption {
  type: 'User';
}

// Channel option
export interface ChannelSlashCommandOption extends BaseSlashCommandOption {
  type: 'Channel';
  channelTypes?: (keyof typeof ChannelType)[];
}

// Role option
export interface RoleSlashCommandOption extends BaseSlashCommandOption {
  type: 'Role';
}

// Mentionable option
export interface MentionableSlashCommandOption extends BaseSlashCommandOption {
  type: 'Mentionable';
}

// Attachment option
export interface AttachmentSlashCommandOption extends BaseSlashCommandOption {
  type: 'Attachment';
}

// Union type for all option types (without Subcommand and SubcommandGroup)
export type SlashCommandOption = 
  | StringSlashCommandOption
  | IntegerSlashCommandOption
  | NumberSlashCommandOption
  | BooleanSlashCommandOption
  | UserSlashCommandOption
  | ChannelSlashCommandOption
  | RoleSlashCommandOption
  | MentionableSlashCommandOption
  | AttachmentSlashCommandOption;

// Object-based options type
export type SlashCommandOptions = Record<string, SlashCommandOption>;

export type SlashCommandHandle = (ctx: ChatInputInteractionWrapper) => void | Promise<void>

// Registration config type that includes all properties
export interface SlashCommandRegistrationConfig<T extends string> {
  id: string;
  name: T;
  description: string;
  handle: SlashCommandHandle;
  options?: SlashCommandOptions;
  defaultMemberPermissions?: (keyof PermissionFlags)[];
  contexts?: (keyof typeof InteractionContextType)[];
  nsfw?: boolean;
  type?: 'ChatInput';
  clientId?: string; // Target specific client, defaults to first client if not specified
}

export interface SlashCommand<N extends string = string> extends SlashCommandRegistrationConfig<N> {
  type: 'ChatInput';
  nameCombinations: string[];
}
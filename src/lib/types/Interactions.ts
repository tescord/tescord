import { SlashCommand } from "./SlashCommand";
import { GetLocalization } from "$lib/Locale";
import { CustomDataValue } from "./ComponentBuilder";
import {
  ButtonComponentOptions,
  SelectMenuComponentOptions,
  ModalComponentOptions,
} from "./ComponentOptions";
import { TessenClient } from "$lib/Tessen";
import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  RoleSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  ModalSubmitInteraction,
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
  Message,
  AutocompleteInteraction,
} from "discord.js";

// Localization helper type with direct locale access
type LocalizationGetter = {
  locale: {
    guild: GetLocalization;
    user: GetLocalization;
  };
};

// Base context interface that includes common properties for all interactions
interface BaseInteractionContext extends LocalizationGetter {
  client: TessenClient;
}

export interface ChatInputInteractionWrapper
  extends BaseInteractionContext {
  type: "chatInput";
  interaction: ChatInputCommandInteraction;
  commandName: string;
  message?: Message;
}

export interface ButtonInteractionWrapper
  extends BaseInteractionContext {
  type: "button";
  interaction: ButtonInteraction;
  customId: string;
  data: CustomDataValue[];
}

export interface StringSelectMenuInteractionWrapper
  extends BaseInteractionContext {
  type: "stringSelectMenu";
  interaction: StringSelectMenuInteraction;
  customId: string;
  data: CustomDataValue[];
}

export interface UserSelectMenuInteractionWrapper
  extends BaseInteractionContext {
  type: "userSelectMenu";
  interaction: UserSelectMenuInteraction;
  customId: string;
  data: CustomDataValue[];
}

export interface RoleSelectMenuInteractionWrapper
  extends BaseInteractionContext {
  type: "roleSelectMenu";
  interaction: RoleSelectMenuInteraction;
  customId: string;
  data: CustomDataValue[];
}

export interface ChannelSelectMenuInteractionWrapper
  extends BaseInteractionContext {
  type: "channelSelectMenu";
  interaction: ChannelSelectMenuInteraction;
  customId: string;
  data: CustomDataValue[];
}

export interface MentionableSelectMenuInteractionWrapper
  extends BaseInteractionContext {
  type: "mentionableSelectMenu";
  interaction: MentionableSelectMenuInteraction;
  customId: string;
  data: CustomDataValue[];
}

export interface ModalInteractionWrapper
  extends BaseInteractionContext {
  type: "modal";
  interaction: ModalSubmitInteraction;
  customId: string;
  data: CustomDataValue[];
}

export interface UserContextMenuInteractionWrapper
  extends BaseInteractionContext {
  type: "userContextMenu";
  interaction: UserContextMenuCommandInteraction;
  commandName: string;
}

export interface MessageContextMenuInteractionWrapper
  extends BaseInteractionContext {
  type: "messageContextMenu";
  interaction: MessageContextMenuCommandInteraction;
  commandName: string;
}

export interface AutocompleteInteractionWrapper
  extends BaseInteractionContext {
  type: "autocomplete";
  interaction: AutocompleteInteraction;
  commandName: string;
  focusedOption: {
    name: string;
    value: string;
    type: "String" | "Integer" | "Number";
  };
}

// Handle types
export type UserContextMenuHandle = (
  ctx: UserContextMenuInteractionWrapper,
) => void | Promise<void>;
export type MessageContextMenuHandle = (
  ctx: MessageContextMenuInteractionWrapper,
) => void | Promise<void>;
export type ButtonHandle = (
  ctx: ButtonInteractionWrapper,
) => void | Promise<void>;
export type StringSelectMenuHandle = (
  ctx: StringSelectMenuInteractionWrapper,
) => void | Promise<void>;
export type UserSelectMenuHandle = (
  ctx: UserSelectMenuInteractionWrapper,
) => void | Promise<void>;
export type RoleSelectMenuHandle = (
  ctx: RoleSelectMenuInteractionWrapper,
) => void | Promise<void>;
export type ChannelSelectMenuHandle = (
  ctx: ChannelSelectMenuInteractionWrapper,
) => void | Promise<void>;
export type MentionableSelectMenuHandle = (
  ctx: MentionableSelectMenuInteractionWrapper,
) => void | Promise<void>;
export type ModalHandle = (
  ctx: ModalInteractionWrapper,
) => void | Promise<void>;

// Registration configs
export interface UserContextMenuRegistrationConfig<T extends string> {
  id: string;
  name: T;
  handle: UserContextMenuHandle;
  clientId?: string; // Target specific client, defaults to first client if not specified
}

export interface MessageContextMenuRegistrationConfig<T extends string> {
  id: string;
  name: T;
  handle: MessageContextMenuHandle;
  clientId?: string; // Target specific client, defaults to first client if not specified
}

export interface ButtonRegistrationConfig {
  id: string;
  handle: ButtonHandle;
  options?: ButtonComponentOptions;
}

export interface StringSelectMenuRegistrationConfig {
  id: string;
  handle: StringSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface UserSelectMenuRegistrationConfig {
  id: string;
  handle: UserSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface RoleSelectMenuRegistrationConfig {
  id: string;
  handle: RoleSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface ChannelSelectMenuRegistrationConfig {
  id: string;
  handle: ChannelSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface MentionableSelectMenuRegistrationConfig {
  id: string;
  handle: MentionableSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface ModalRegistrationConfig {
  id: string;
  handle: ModalHandle;
  options?: ModalComponentOptions;
}

// Existing interaction data interfaces
export interface ButtonInteractionData {
  id: string;
  type: "Button";
  handle: ButtonHandle;
  options?: ButtonComponentOptions;
}

export interface StringSelectMenuInteractionData {
  id: string;
  type: "StringSelectMenu";
  handle: StringSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface UserSelectMenuInteractionData {
  id: string;
  type: "UserSelectMenu";
  handle: UserSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface RoleSelectMenuInteractionData {
  id: string;
  type: "RoleSelectMenu";
  handle: RoleSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface ChannelSelectMenuInteractionData {
  id: string;
  type: "ChannelSelectMenu";
  handle: ChannelSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface MentionableSelectMenuInteractionData {
  id: string;
  type: "MentionableSelectMenu";
  handle: MentionableSelectMenuHandle;
  options?: SelectMenuComponentOptions;
}

export interface ModalInteractionData {
  id: string;
  type: "Modal";
  handle: ModalHandle;
  options?: ModalComponentOptions;
}

// Context menu command interfaces
export interface UserContextMenuCommand {
  id: string;
  name: string;
  type: "User";
  handle: UserContextMenuHandle;
  clientId?: string;
}

export interface MessageContextMenuCommand {
  id: string;
  name: string;
  type: "Message";
  handle: MessageContextMenuHandle;
  clientId?: string;
}

export type MessageInteraction = ChatInputInteractionWrapper;
export type ActionInteraction =
  | ButtonInteractionWrapper
  | StringSelectMenuInteractionWrapper
  | UserSelectMenuInteractionWrapper
  | RoleSelectMenuInteractionWrapper
  | ChannelSelectMenuInteractionWrapper
  | MentionableSelectMenuInteractionWrapper
  | ModalInteractionWrapper
  | UserContextMenuInteractionWrapper
  | MessageContextMenuInteractionWrapper
  | AutocompleteInteractionWrapper;
export type Interaction =
  | MessageInteraction
  | ActionInteraction
  | SlashCommand<string>
  | UserContextMenuCommand
  | MessageContextMenuCommand
  | ButtonInteractionData
  | StringSelectMenuInteractionData
  | UserSelectMenuInteractionData
  | RoleSelectMenuInteractionData
  | ChannelSelectMenuInteractionData
  | MentionableSelectMenuInteractionData
  | ModalInteractionData;

import { ChannelType, TextInputComponentData } from "discord.js";

// Button style mapping
export type ButtonStyleNames = 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link';

// Button component options
export interface ButtonComponentOptions {
  label?: string;
  style?: ButtonStyleNames;
  disabled?: boolean;
  emoji?: string;
  url?: string; // Only for Link style buttons
}

// Select menu component options - base interface
export interface BaseSelectMenuComponentOptions {
  placeholder?: string;
  disabled?: boolean;
  minValues?: number;
  maxValues?: number;
  defaultValues?: string[];
}

// String select menu options - requires options array
export interface StringSelectMenuComponentOptions extends BaseSelectMenuComponentOptions {
  options: Array<{ label: string; value: string; description?: string; emoji?: string }>;
}

// User select menu options - no options array needed
export interface UserSelectMenuComponentOptions extends BaseSelectMenuComponentOptions {
  // Discord automatically populates with users
}

// Role select menu options - no options array needed
export interface RoleSelectMenuComponentOptions extends BaseSelectMenuComponentOptions {
  // Discord automatically populates with roles
}

// Channel select menu options - no options array needed
export interface ChannelSelectMenuComponentOptions extends BaseSelectMenuComponentOptions {
  channelTypes?: ChannelType[]; // Optional: limit to specific channel types
}

// Mentionable select menu options - no options array needed
export interface MentionableSelectMenuComponentOptions extends BaseSelectMenuComponentOptions {
  // Discord automatically populates with users and roles
}

// Union type for all select menu options
export type SelectMenuComponentOptions = 
  | StringSelectMenuComponentOptions 
  | UserSelectMenuComponentOptions 
  | RoleSelectMenuComponentOptions 
  | ChannelSelectMenuComponentOptions 
  | MentionableSelectMenuComponentOptions;

// Modal component options
export interface ModalComponentOptions {
  title?: string;
  components?: { type: 1, components: TextInputComponentData[] }[]; // Modal text input components
}

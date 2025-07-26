import { 
  ButtonComponentOptions, 
  SelectMenuComponentOptions,
  StringSelectMenuComponentOptions,
  UserSelectMenuComponentOptions,
  RoleSelectMenuComponentOptions,
  ChannelSelectMenuComponentOptions,
  MentionableSelectMenuComponentOptions,
  ModalComponentOptions 
} from "./ComponentOptions";
import { ComponentType, ButtonStyle, ModalComponentData, ButtonComponentData, StringSelectMenuComponentData, UserSelectMenuComponentData, RoleSelectMenuComponentData, ChannelSelectMenuComponentData, MentionableSelectMenuComponentData } from "discord.js";
import { PackEventMap } from "./PackEvents";
import { ResultEventEmitter } from "./ResultEventEmitter";

export const CUSTOM_DATA_SPLITTER = "䲜";
export const CUSTOM_DATA_NUMBER_INDICATOR = "㥻";

// Global interface that can be extended by modules
declare global {
  namespace Tessen {
    interface CustomDataTypes {
      // Default types - these are always available
      string: string;
      number: number;
    }

    interface ComponentMap {
      // Direct mapping of component IDs to their types
      // [componentId: string]: 'Button' | 'StringSelectMenu' | 'UserSelectMenu' | 'RoleSelectMenu' | 'ChannelSelectMenu' | 'MentionableSelectMenu' | 'Modal';
    }
  }
}

// Type helper to extract all custom data types
export type CustomDataValue = Tessen.CustomDataTypes[keyof Tessen.CustomDataTypes];

// Recursive partial type for deep partial objects
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event data interfaces for custom data processing
export interface CustomDataEncodeEventData {
  notParsed: CustomDataValue[];
  parsed: string[];
}

export interface CustomDataDecodeEventData {
  notParsed: string[];
  parsed: CustomDataValue[];
}

// Built component types - using Discord.js native types
export type BuiltButtonComponent = ButtonComponentData;
export type BuiltStringSelectMenuComponent = StringSelectMenuComponentData;
export type BuiltUserSelectMenuComponent = UserSelectMenuComponentData;
export type BuiltRoleSelectMenuComponent = RoleSelectMenuComponentData;
export type BuiltChannelSelectMenuComponent = ChannelSelectMenuComponentData;
export type BuiltMentionableSelectMenuComponent = MentionableSelectMenuComponentData;
export type BuiltModalComponent = ModalComponentData;

// Union type for all select menu components
export type BuiltSelectMenuComponent = 
  | BuiltStringSelectMenuComponent 
  | BuiltUserSelectMenuComponent 
  | BuiltRoleSelectMenuComponent 
  | BuiltChannelSelectMenuComponent 
  | BuiltMentionableSelectMenuComponent;

export type BuiltComponent = BuiltButtonComponent | BuiltSelectMenuComponent | BuiltModalComponent;

// Conditional return type based on component type
export type BuiltComponentReturn<T extends keyof Tessen.ComponentMap> = 
  Tessen.ComponentMap[T] extends 'Button' 
    ? BuiltButtonComponent
    : Tessen.ComponentMap[T] extends 'StringSelectMenu'
    ? BuiltStringSelectMenuComponent
    : Tessen.ComponentMap[T] extends 'UserSelectMenu'
    ? BuiltUserSelectMenuComponent
    : Tessen.ComponentMap[T] extends 'RoleSelectMenu'
    ? BuiltRoleSelectMenuComponent
    : Tessen.ComponentMap[T] extends 'ChannelSelectMenu'
    ? BuiltChannelSelectMenuComponent
    : Tessen.ComponentMap[T] extends 'MentionableSelectMenu'
    ? BuiltMentionableSelectMenuComponent
    : Tessen.ComponentMap[T] extends 'Modal'
    ? BuiltModalComponent
    : BuiltComponent; // Fallback for unknown types

// Component build configuration with flexible data typing
export interface ComponentBuildConfig<T extends keyof Tessen.ComponentMap = keyof Tessen.ComponentMap> {
  id: T;
  data?: CustomDataValue[];
  overrides?: Tessen.ComponentMap[T] extends 'Button' 
    ? DeepPartial<ButtonComponentOptions>
    : Tessen.ComponentMap[T] extends 'StringSelectMenu'
    ? DeepPartial<StringSelectMenuComponentOptions>
    : Tessen.ComponentMap[T] extends 'UserSelectMenu'
    ? DeepPartial<UserSelectMenuComponentOptions>
    : Tessen.ComponentMap[T] extends 'RoleSelectMenu'
    ? DeepPartial<RoleSelectMenuComponentOptions>
    : Tessen.ComponentMap[T] extends 'ChannelSelectMenu'
    ? DeepPartial<ChannelSelectMenuComponentOptions>
    : Tessen.ComponentMap[T] extends 'MentionableSelectMenu'
    ? DeepPartial<MentionableSelectMenuComponentOptions>
    : Tessen.ComponentMap[T] extends 'Modal'
    ? DeepPartial<ModalComponentOptions>
    : DeepPartial<ButtonComponentOptions | SelectMenuComponentOptions | ModalComponentOptions>; // Fallback for unknown types
}

// Helper type to ensure component ID exists in the map
export type ValidComponentId = keyof Tessen.ComponentMap;

// Updated utility functions with sequential event processing
export async function encodeCustomData(
  baseId: string, 
  data?: CustomDataValue[], 
  eventEmitter?: ResultEventEmitter<PackEventMap>
): Promise<string> {
  if (!data || data.length === 0) {
    return baseId;
  }

  // Prepare event data
  const eventData: CustomDataEncodeEventData = {
    notParsed: [...data],
    parsed: []
  };

  // Emit event to allow packs to process custom data types sequentially
  if (eventEmitter) {
    // Process listeners one by one to avoid race conditions
    for await (const result of eventEmitter.emitAsync('tessen:customData:encode', eventData)) {
      // Each listener can modify the eventData arrays
      // Process completes when all listeners have finished
    }
  }

  // Process remaining unhandled items with default logic
  const finalParsed: string[] = [...eventData.parsed];
  
  for (const item of eventData.notParsed) {
    if (typeof item === 'number') {
      finalParsed.push(CUSTOM_DATA_NUMBER_INDICATOR + item.toString());
    } else if (typeof item === 'string') {
      finalParsed.push(item);
    } else {
      // Fallback for unhandled types - convert to string
      finalParsed.push(JSON.stringify(item));
    }
  }

  const encodedData = finalParsed.join(CUSTOM_DATA_SPLITTER);
  return `${baseId}${CUSTOM_DATA_SPLITTER}${encodedData}`;
}

export async function parseCustomData(
  customId: string,
  eventEmitter?: ResultEventEmitter<PackEventMap>
): Promise<{ id: string; data: CustomDataValue[] }> {
  const parts = customId.split(CUSTOM_DATA_SPLITTER);
  const id = parts[0];
  
  if (parts.length === 1) {
    return { id, data: [] };
  }

  // Prepare event data
  const eventData: CustomDataDecodeEventData = {
    notParsed: parts.slice(1),
    parsed: []
  };

  // Emit event to allow packs to process custom data types sequentially
  if (eventEmitter) {
    // Process listeners one by one to avoid race conditions
    for await (const result of eventEmitter.emitAsync('tessen:customData:decode', eventData)) {
      // Each listener can modify the eventData arrays
      // Process completes when all listeners have finished
    }
  }

  // Process remaining unhandled items with default logic
  for (const part of eventData.notParsed) {
    if (part.startsWith(CUSTOM_DATA_NUMBER_INDICATOR)) {
      const numberValue = part.substring(CUSTOM_DATA_NUMBER_INDICATOR.length);
      eventData.parsed.push(Number(numberValue));
    } else {
      eventData.parsed.push(part);
    }
  }

  return { id, data: eventData.parsed };
}

// Synchronous versions for backward compatibility
export function encodeCustomDataSync(
  baseId: string, 
  data?: CustomDataValue[], 
  eventEmitter?: ResultEventEmitter<PackEventMap>
): string {
  if (!data || data.length === 0) {
    return baseId;
  }

  // Prepare event data
  const eventData: CustomDataEncodeEventData = {
    notParsed: [...data],
    parsed: []
  };

  // Emit event synchronously
  if (eventEmitter) {
    eventEmitter.emit('tessen:customData:encode', eventData);
  }

  // Process remaining unhandled items with default logic
  const finalParsed: string[] = [...eventData.parsed];
  
  for (const item of eventData.notParsed) {
    if (typeof item === 'number') {
      finalParsed.push(CUSTOM_DATA_NUMBER_INDICATOR + item.toString());
    } else if (typeof item === 'string') {
      finalParsed.push(item);
    } else {
      // Fallback for unhandled types - convert to string
      finalParsed.push(JSON.stringify(item));
    }
  }

  const encodedData = finalParsed.join(CUSTOM_DATA_SPLITTER);
  return `${baseId}${CUSTOM_DATA_SPLITTER}${encodedData}`;
}

export function parseCustomDataSync(
  customId: string,
  eventEmitter?: ResultEventEmitter<PackEventMap>
): { id: string; data: CustomDataValue[] } {
  const parts = customId.split(CUSTOM_DATA_SPLITTER);
  const id = parts[0];
  
  if (parts.length === 1) {
    return { id, data: [] };
  }

  // Prepare event data
  const eventData: CustomDataDecodeEventData = {
    notParsed: parts.slice(1),
    parsed: []
  };

  // Emit event synchronously
  if (eventEmitter) {
    eventEmitter.emit('tessen:customData:decode', eventData);
  }

  // Process remaining unhandled items with default logic
  for (const part of eventData.notParsed) {
    if (part.startsWith(CUSTOM_DATA_NUMBER_INDICATOR)) {
      const numberValue = part.substring(CUSTOM_DATA_NUMBER_INDICATOR.length);
      eventData.parsed.push(Number(numberValue));
    } else {
      eventData.parsed.push(part);
    }
  }

  return { id, data: eventData.parsed };
}

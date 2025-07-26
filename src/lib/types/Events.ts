import { GetLocalization } from "$lib/Locale";
import { TescordClientEvents } from "./ClientEvents";
import { Guild, User } from "discord.js";

// Localization helper type for events
type EventLocalizationGetter = {
  locale: {
    guild: GetLocalization;
    user: GetLocalization;
  };
};

// Enhanced event context with localization
export type EnhancedEventContext<T> = T & EventLocalizationGetter;

// Extract event context types from the generated ClientEvents with localization
export type EventContextMap = {
  [K in keyof TescordClientEvents]: EnhancedEventContext<TescordClientEvents[K]>;
};

// Generic event registration config with automatic context type inference and localization
export interface EventRegistrationConfig<T extends keyof TescordClientEvents> {
  event: T;
  handle: (ctx: EventContextMap[T]) => void | Promise<void>;
}

// Custom event registration for non-Discord.js events
export interface CustomEventRegistrationConfig<T = any> {
  event: string;
  handle: (ctx: EnhancedEventContext<T>) => void | Promise<void>;
}

// Union type for all event registration configs
export type AnyEventRegistrationConfig = 
  | { [K in keyof TescordClientEvents]: EventRegistrationConfig<K> }[keyof TescordClientEvents];

// Event data interface for storage
export interface EventData {
  event: string;
  handle: (ctx: any) => void | Promise<void>;
}

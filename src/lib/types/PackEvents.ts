import { CustomDataEncodeEventData, CustomDataDecodeEventData } from "./ComponentBuilder";
import { TescordClient } from "$lib/Tescord";
import { Collection } from "discord.js";
import { TescordClientEvents } from "./ClientEvents";

// Unified event data types
export interface TescordClientEventData {
  client: TescordClient;
  event: string;
  args: unknown[];
}

// Extract event data type from TescordClientEvents based on event name
type GetClientEventData<E extends keyof TescordClientEvents> = TescordClientEvents[E];

// Helper type to extract event name from pattern like "clientId:eventName"
type ExtractEventName<T extends string> = T extends `${string}:${infer EventName}` 
  ? EventName extends keyof TescordClientEvents 
    ? EventName 
    : never 
  : never;

// Create specific event data type based on the event pattern
type DynamicClientEventData<T extends string> = ExtractEventName<T> extends keyof TescordClientEvents
  ? {
      client: TescordClient;
      event: ExtractEventName<T>;
      args: unknown[];
    } & GetClientEventData<ExtractEventName<T>>
  : TescordClientEventData;

// Unified event map for both Pack and Tescord (all events are shared)
export interface BasePackEventMap {
  // Custom data events
  'tescord:customData:encode': [data: CustomDataEncodeEventData];
  'tescord:customData:decode': [data: CustomDataDecodeEventData];
  
  // Pack lifecycle events
  'pack:loaded': [data: { packId: string }];
  'pack:unloaded': [data: { packId: string }];
  'pack:destroyed': [data: { packId: string }];
  
  // Interaction events
  'interaction:registered': [data: { interactionId: string; type: string }];
  'interaction:unregistered': [data: { interactionId: string; type: string }];
  
  // Locale events
  'locale:loaded': [data: { localeId: string; language: string }];
  'locale:unloaded': [data: { localeId: string; language: string }];
  
  // Inspector events
  'inspector:registered': [data: { inspectorId: string }];
  'inspector:unregistered': [data: { inspectorId: string }];
  
  // Client lifecycle events (available to all packs)
  'tescord:clientReady': [data: { client: TescordClient }];
  'tescord:clientDestroy': [data: { client: TescordClient }];
  'tescord:clientsReady': [data: { clients: Collection<string, TescordClient> }];
  'tescord:clientEvent': [data: TescordClientEventData];
  
  // Cache events (available to all packs)
  'tescord:cacheRefreshed': [data: { timestamp: number }];
  'tescord:localesRefreshed': [data: { contentLocales: string[]; interactionLocales: string[] }];
  
  // Publishing events (available to all packs)
  'tescord:interactionsPublished': [data: { clientId: string; count: number }];
  'tescord:interactionsPublishError': [data: { clientId: string; error: Error }];
}

// Dynamic client events as a separate exported type
export type DynamicClientEventMap = {
  [K in `${string}:${keyof TescordClientEvents}`]: [data: DynamicClientEventData<K>];
};

// Combined event map with proper index signature for ResultEventEmitter constraint
export interface PackEventMap extends BasePackEventMap, DynamicClientEventMap {
  // Index signature to satisfy Record<string, unknown[]> constraint
  [key: string]: unknown[];
}

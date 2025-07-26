import { CustomDataEncodeEventData, CustomDataDecodeEventData } from "./ComponentBuilder";
import { TessenClient } from "$lib/Tessen";
import { Collection } from "discord.js";
import { TessenClientEvents } from "./ClientEvents";

// Unified event data types
export interface TessenClientEventData {
  client: TessenClient;
  event: string;
  args: unknown[];
}

// Extract event data type from TessenClientEvents based on event name
type GetClientEventData<E extends keyof TessenClientEvents> = TessenClientEvents[E];

// Helper type to extract event name from pattern like "clientId:eventName"
type ExtractEventName<T extends string> = T extends `${string}:${infer EventName}` 
  ? EventName extends keyof TessenClientEvents 
    ? EventName 
    : never 
  : never;

// Create specific event data type based on the event pattern
type DynamicClientEventData<T extends string> = ExtractEventName<T> extends keyof TessenClientEvents
  ? {
      client: TessenClient;
      event: ExtractEventName<T>;
      args: unknown[];
    } & GetClientEventData<ExtractEventName<T>>
  : TessenClientEventData;

// Unified event map for both Pack and Tessen (all events are shared)
export interface BasePackEventMap {
  // Custom data events
  'tessen:customData:encode': [data: CustomDataEncodeEventData];
  'tessen:customData:decode': [data: CustomDataDecodeEventData];
  
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
  'tessen:clientReady': [data: { client: TessenClient }];
  'tessen:clientDestroy': [data: { client: TessenClient }];
  'tessen:clientsReady': [data: { clients: Collection<string, TessenClient> }];
  'tessen:clientEvent': [data: TessenClientEventData];
  
  // Cache events (available to all packs)
  'tessen:cacheRefreshed': [data: { timestamp: number }];
  'tessen:localesRefreshed': [data: { contentLocales: string[]; interactionLocales: string[] }];
  
  // Publishing events (available to all packs)
  'tessen:interactionsPublished': [data: { clientId: string; count: number }];
  'tessen:interactionsPublishError': [data: { clientId: string; error: Error }];
}

// Dynamic client events as a separate exported type
export type DynamicClientEventMap = {
  [K in `${string}:${keyof TessenClientEvents}`]: [data: DynamicClientEventData<K>];
};

// Combined event map with proper index signature for ResultEventEmitter constraint
export interface PackEventMap extends BasePackEventMap, DynamicClientEventMap {
  // Index signature to satisfy Record<string, unknown[]> constraint
  [key: string]: unknown[];
}

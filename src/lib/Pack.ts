import { Collection } from "discord.js";

import { Identifiable } from "$types/Identifiable";
import { DisposeCallback } from "$types/DisposeCallback";
import { Usable } from "$types/Usable";
import {
  SlashCommandName,
  SlashCommand,
  SlashCommandRegistrationConfig,
} from "$types/SlashCommand";
import {
  Interaction,
  UserContextMenuRegistrationConfig,
  MessageContextMenuRegistrationConfig,
  ButtonRegistrationConfig,
  StringSelectMenuRegistrationConfig,
  UserSelectMenuRegistrationConfig,
  RoleSelectMenuRegistrationConfig,
  ChannelSelectMenuRegistrationConfig,
  MentionableSelectMenuRegistrationConfig,
  ModalRegistrationConfig,
  UserContextMenuCommand,
  MessageContextMenuCommand,
  ButtonInteractionData,
  StringSelectMenuInteractionData,
  UserSelectMenuInteractionData,
  RoleSelectMenuInteractionData,
  ChannelSelectMenuInteractionData,
  MentionableSelectMenuInteractionData,
  ModalInteractionData,
} from "$types/Interactions";
import { generateCombinations } from "$utils/pattern";
import { CommandNameNoCombinationsError } from "./errors/CommandNameNoCombinationsError";
import { CommandNameExceededMaxLengthError } from "./errors/CommandNameExceededMaxLengthError";
import { Inspector } from "$lib/Inspector";
import EventEmitter from "events";
import { AnyEventRegistrationConfig, EventData } from "$types/Events";
import { Locale } from "$lib/Locale";
import {
  ButtonComponentOptions,
  SelectMenuComponentOptions,
  ModalComponentOptions,
} from "$types/ComponentOptions";
import { parseCustomDataSync, CustomDataValue } from "$types/ComponentBuilder";

import { PackEventMap } from "$types/PackEvents";
import { ResultEventEmitter } from "$types/ResultEventEmitter";

export interface PackConfig {
  id: string;
}

export class Pack<
  Config extends PackConfig = PackConfig
> implements Identifiable
{
  private unloaders: DisposeCallback[] = [];

  data = {
    locales: new Collection<string, Locale>(),
    subPacks: new Collection<string, Pack>(),
    interactions: new Collection<string, Interaction>(),
    events: new Collection<string, EventData>(),
    inspectors: new Collection<string, Inspector>(),
  };

  private _events = new ResultEventEmitter<PackEventMap>();

  // Create a proper events object that extends ResultEventEmitter with propagation
  events = (() => {
    const propagatingEmitter = Object.create(this._events);

    // Override emit methods to use propagation
    propagatingEmitter.emit = <K extends keyof PackEventMap>(
      event: K,
      ...args: PackEventMap[K]
    ): unknown[] => {
      return this.emitEvent(event, ...args);
    };

    propagatingEmitter.emitAsync = <K extends keyof PackEventMap>(
      event: K,
      ...args: PackEventMap[K]
    ): AsyncIterableIterator<unknown> => {
      return this.emitEventAsync(event, ...args);
    };

    propagatingEmitter.emitUntilResultAsync = <K extends keyof PackEventMap>(
      event: K,
      ...args: PackEventMap[K]
    ): Promise<unknown> => {
      return this.emitEventUntilResultAsync(event, ...args);
    };

    propagatingEmitter.emitUntilResult = <K extends keyof PackEventMap>(
      event: K,
      ...args: PackEventMap[K]
    ): unknown => {
      return this.emitEventUntilResultSync(event, ...args);
    };

    return propagatingEmitter as ResultEventEmitter<PackEventMap>;
  })();

  get id() {
    return this.config.id;
  }

  constructor(public config: Config) {
    if (config.id === "tescord") throw new Error("Pack id cannot be 'tescord'.");
  }

  // Override emit to propagate events to all subpacks
  private emitToSubPacks<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): void {
    // Emit to this pack
    this._events.emit(event, ...args);

    // Recursively emit to all subpacks
    this.data.subPacks.forEach((subPack) => {
      subPack.emitToSubPacks(event, ...args);
    });
  }

  // Enhanced emit that can collect results from subpacks with async iterator
  private async *emitToSubPacksWithAsyncIterator<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): AsyncIterableIterator<unknown> {
    // Emit to this pack and yield results
    for await (const result of this._events.emitAsync(event, ...args)) {
      yield result;
    }

    // Recursively emit to all subpacks and yield their results
    for (const [, subPack] of this.data.subPacks) {
      for await (const result of subPack.emitToSubPacksWithAsyncIterator(
        event,
        ...args,
      )) {
        yield result;
      }
    }
  }

  // Enhanced async emit that can collect results from subpacks
  private async emitToSubPacksWithResultsAsync<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): Promise<unknown[]> {
    const allResults: unknown[] = [];

    // Collect results from this pack and all subpacks
    for await (const result of this.emitToSubPacksWithAsyncIterator(
      event,
      ...args,
    )) {
      allResults.push(result);
    }

    return allResults;
  }

  // Public method to emit events that propagate to subpacks
  emitEvent<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): unknown[] {
    const allResults: unknown[] = [];

    // Collect results from this pack
    const thisResults = this._events.emit(event, ...args);
    allResults.push(...thisResults);

    // Recursively collect results from all subpacks
    this.data.subPacks.forEach((subPack) => {
      const subResults = subPack.emitEvent(event, ...args);
      allResults.push(...subResults);
    });

    return allResults;
  }

  // Public method to emit events and get async iterator for all results
  async *emitEventAsync<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): AsyncIterableIterator<unknown> {
    for await (const result of this.emitToSubPacksWithAsyncIterator(
      event,
      ...args,
    )) {
      yield result;
    }
  }

  // Public method to emit events and collect all results from all packs (async-aware)
  async emitEventWithResultsAsync<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): Promise<unknown[]> {
    return await this.emitToSubPacksWithResultsAsync(event, ...args);
  }

  // Emit until first truthy result (async-aware)
  async emitEventUntilResultAsync<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): Promise<unknown> {
    // Try this pack first
    const thisResult = await this._events.emitUntilResultAsync(event, ...args);
    if (thisResult !== undefined) {
      return thisResult;
    }

    // Try subpacks
    for (const [, subPack] of this.data.subPacks) {
      const subResult = await subPack.emitEventUntilResultAsync(event, ...args);
      if (subResult !== undefined) {
        return subResult;
      }
    }

    return undefined;
  }

  // Emit until first truthy result (sync only, faster)
  emitEventUntilResultSync<K extends keyof PackEventMap>(
    event: K,
    ...args: PackEventMap[K]
  ): unknown {
    // Try this pack first
    const thisResult = this._events.emitUntilResult(event, ...args);
    if (thisResult !== undefined) {
      return thisResult;
    }

    // Try subpacks
    for (const [, subPack] of this.data.subPacks) {
      const subResult = subPack.emitEventUntilResultSync(event, ...args);
      if (subResult !== undefined) {
        return subResult;
      }
    }

    return undefined;
  }

  use(...args: Usable[]): DisposeCallback {
    const disposeCallbacks: DisposeCallback[] = [];

    for (const arg of args) {
      switch (true) {
        case arg instanceof Pack: {
          this.data.subPacks.set(arg.id, arg);
          this.emitEvent("pack:loaded", { packId: arg.id });
          disposeCallbacks.push(() => {
            this.data.subPacks.delete(arg.id);
            this.emitEvent("pack:unloaded", { packId: arg.id });
          });
          break;
        }
        case arg instanceof Inspector: {
          this.data.inspectors.set(arg.id, arg);
          this.emitEvent("inspector:registered", { inspectorId: arg.id });
          disposeCallbacks.push(() => {
            this.data.inspectors.delete(arg.id);
            this.emitEvent("inspector:unregistered", { inspectorId: arg.id });
          });
          break;
        }
        case arg instanceof Locale: {
          this.data.locales.set(arg.id, arg);
          this.emitEvent("locale:loaded", {
            localeId: arg.id,
            language: "unknown",
          });
          disposeCallbacks.push(() => {
            this.data.locales.delete(arg.id);
            this.emitEvent("locale:unloaded", {
              localeId: arg.id,
              language: "unknown",
            });
          });
          break;
        }
      }
    }

    return () => {
      disposeCallbacks.forEach((dispose) => dispose());
      disposeCallbacks.length = 0;
    };
  }

  slashCommand<T extends string>(
    cfg: SlashCommandRegistrationConfig<
      T extends SlashCommandName<T> ? T : never
    >,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with name ${cfg.id} already exists.`);

    const nameCombinations = generateCombinations(cfg.name);

    this.isSlashCommandValid(cfg, nameCombinations);

    const slashCommand: SlashCommand<T> = {
      ...cfg,
      type: "ChatInput",
      nameCombinations,
    };

    this.data.interactions.set(cfg.id, slashCommand);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "ChatInput",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "ChatInput",
      });
    };
  }

  event(cfg: AnyEventRegistrationConfig): DisposeCallback {
    const eventId = `${this.id}:${cfg.event}:${Date.now()}`;

    const eventData: EventData = {
      event: cfg.event,
      handle: cfg.handle,
    };

    this.data.events.set(eventId, eventData);

    return () => this.data.events.delete(eventId);
  }

  userContextMenu<T extends string>(
    cfg: UserContextMenuRegistrationConfig<T>,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with name ${cfg.id} already exists.`);

    const contextMenuCommand: UserContextMenuCommand = {
      ...cfg,
      type: "User",
    };

    this.data.interactions.set(cfg.id, contextMenuCommand);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "User",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "User",
      });
    };
  }

  messageContextMenu<T extends string>(
    cfg: MessageContextMenuRegistrationConfig<T>,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with name ${cfg.id} already exists.`);

    const contextMenuCommand: MessageContextMenuCommand = {
      ...cfg,
      type: "Message",
    };

    this.data.interactions.set(cfg.id, contextMenuCommand);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "Message",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "Message",
      });
    };
  }

  button(cfg: ButtonRegistrationConfig): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with id ${cfg.id} already exists.`);

    const buttonInteraction: ButtonInteractionData = {
      id: cfg.id,
      type: "Button" as const,
      handle: cfg.handle,
      options: cfg.options,
    };

    this.data.interactions.set(cfg.id, buttonInteraction);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "Button",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "Button",
      });
    };
  }

  stringSelectMenu(
    cfg: StringSelectMenuRegistrationConfig,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with id ${cfg.id} already exists.`);

    const selectMenuInteraction: StringSelectMenuInteractionData = {
      id: cfg.id,
      type: "StringSelectMenu" as const,
      handle: cfg.handle,
      options: cfg.options,
    };

    this.data.interactions.set(cfg.id, selectMenuInteraction);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "StringSelectMenu",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "StringSelectMenu",
      });
    };
  }

  userSelectMenu(
    cfg: UserSelectMenuRegistrationConfig,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with id ${cfg.id} already exists.`);

    const selectMenuInteraction: UserSelectMenuInteractionData = {
      id: cfg.id,
      type: "UserSelectMenu" as const,
      handle: cfg.handle,
      options: cfg.options,
    };

    this.data.interactions.set(cfg.id, selectMenuInteraction);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "UserSelectMenu",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "UserSelectMenu",
      });
    };
  }

  roleSelectMenu(
    cfg: RoleSelectMenuRegistrationConfig,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with id ${cfg.id} already exists.`);

    const selectMenuInteraction: RoleSelectMenuInteractionData = {
      id: cfg.id,
      type: "RoleSelectMenu" as const,
      handle: cfg.handle,
      options: cfg.options,
    };

    this.data.interactions.set(cfg.id, selectMenuInteraction);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "RoleSelectMenu",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "RoleSelectMenu",
      });
    };
  }

  channelSelectMenu(
    cfg: ChannelSelectMenuRegistrationConfig,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with id ${cfg.id} already exists.`);

    const selectMenuInteraction: ChannelSelectMenuInteractionData = {
      id: cfg.id,
      type: "ChannelSelectMenu" as const,
      handle: cfg.handle,
      options: cfg.options,
    };

    this.data.interactions.set(cfg.id, selectMenuInteraction);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "ChannelSelectMenu",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "ChannelSelectMenu",
      });
    };
  }

  mentionableSelectMenu(
    cfg: MentionableSelectMenuRegistrationConfig,
  ): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with id ${cfg.id} already exists.`);

    const selectMenuInteraction: MentionableSelectMenuInteractionData =
      {
        id: cfg.id,
        type: "MentionableSelectMenu" as const,
        handle: cfg.handle,
        options: cfg.options,
      };

    this.data.interactions.set(cfg.id, selectMenuInteraction);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "MentionableSelectMenu",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "MentionableSelectMenu",
      });
    };
  }

  modal(cfg: ModalRegistrationConfig): DisposeCallback {
    if (this.data.interactions.has(cfg.id))
      throw new Error(`Interaction with id ${cfg.id} already exists.`);

    const modalInteraction: ModalInteractionData = {
      id: cfg.id,
      type: "Modal" as const,
      handle: cfg.handle,
      options: cfg.options,
    };

    this.data.interactions.set(cfg.id, modalInteraction);
    this.emitEvent("interaction:registered", {
      interactionId: cfg.id,
      type: "Modal",
    });

    return () => {
      this.data.interactions.delete(cfg.id);
      this.emitEvent("interaction:unregistered", {
        interactionId: cfg.id,
        type: "Modal",
      });
    };
  }

  // Helper method for parsing custom data with event support (sync version)
  parseCustomData(customId: string): { id: string; data: CustomDataValue[] } {
    return parseCustomDataSync(customId, this.events);
  }

  // Helper method for parsing custom data with sequential async processing
  async parseCustomDataAsync(
    customId: string,
  ): Promise<{ id: string; data: CustomDataValue[] }> {
    const { parseCustomData } = await import("$types/ComponentBuilder");
    return parseCustomData(customId, this.events);
  }

  /**
   * @throws {CommandNameNoCombinationsError} if the command has no name combinations.
   * @throws {CommandNameExceededMaxLengthError} if the command has a name combination with more than 3 words or a word with more than 32 characters.
   */
  private isSlashCommandValid<T extends string>(
    cfg: SlashCommandRegistrationConfig<
      T extends SlashCommandName<T> ? T : never
    >,
    nameCombinations: string[],
  ) {
    if (nameCombinations.length === 0)
      throw new CommandNameNoCombinationsError({
        message: `Interaction with id "${cfg.id}" has no name combinations.`,
      });

    const nameCombinationsSplited = nameCombinations.map((name) =>
      name.split(" "),
    );

    if (
      nameCombinationsSplited.some(
        (name) => name.length > 3 || name.some((word) => word.length > 32),
      )
    )
      throw new CommandNameExceededMaxLengthError({
        message: `Interaction with id "${cfg.id}" has a name combination with more than 3 words. Or a word with more than 32 characters.`,
        nameCombinationsSplited,
      });
  }

  unload(...callbacks: DisposeCallback[]): void {
    this.unloaders.push(...callbacks);
  }

  destroy(): void {
    this.unloaders.forEach((dispose) => dispose());
    this.unloaders.length = 0;

    this.data.interactions.clear();
    this.data.events.clear();
    this.data.inspectors.clear();
    this.data.locales.clear();
    this.data.subPacks.clear();

    this.emitEvent("pack:destroyed", { packId: this.id });
    this._events.removeAllListeners();
  }
}

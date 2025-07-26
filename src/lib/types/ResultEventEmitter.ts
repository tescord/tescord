export type EventListener<Args extends unknown[]> = (...args: Args) => unknown | Promise<unknown>;

interface EventListenerEntry<Args extends unknown[]> {
  listener: EventListener<Args>;
  once: boolean;
}

export class ResultEventEmitter<EventMap extends Record<string, unknown[]>> {
  private eventListeners = new Map<keyof EventMap, Set<EventListenerEntry<EventMap[keyof EventMap]>>>();
  private lastResults: unknown[] = [];
  private maxListeners = 10;

  // Add event listener
  on<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
    this.addListenerInternal(event, listener, false);
    return this;
  }

  // Add one-time event listener
  once<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
    this.addListenerInternal(event, listener, true);
    return this;
  }

  // Internal method to add listeners
  private addListenerInternal<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>, once: boolean): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listeners = this.eventListeners.get(event)!;
    
    // Check max listeners limit
    if (listeners.size >= this.maxListeners && this.maxListeners > 0) {
      console.warn(`MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${listeners.size + 1} ${String(event)} listeners added.`);
    }

    listeners.add({
      listener: listener as EventListener<EventMap[keyof EventMap]>,
      once
    });
  }

  // Remove event listener
  off<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      // Find and remove the listener
      for (const entry of listeners) {
        if (entry.listener === listener) {
          listeners.delete(entry);
          break;
        }
      }
      
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
    return this;
  }

  // Remove all listeners for an event
  removeAllListeners<K extends keyof EventMap>(event?: K): this {
    if (event !== undefined) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
    return this;
  }

  // Get listeners for an event
  listeners<K extends keyof EventMap>(event: K): EventListener<EventMap[K]>[] {
    const listeners = this.eventListeners.get(event);
    return listeners ? Array.from(listeners).map(entry => entry.listener as EventListener<EventMap[K]>) : [];
  }

  // Get raw listener entries (internal)
  private getListenerEntries<K extends keyof EventMap>(event: K): EventListenerEntry<EventMap[K]>[] {
    const listeners = this.eventListeners.get(event);
    return listeners ? Array.from(listeners) as EventListenerEntry<EventMap[K]>[] : [];
  }

  // Get listener count for an event
  listenerCount<K extends keyof EventMap>(event: K): number {
    const listeners = this.eventListeners.get(event);
    return listeners ? listeners.size : 0;
  }

  // Check if event has listeners
  hasListeners<K extends keyof EventMap>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }

  // Get all event names
  eventNames(): (keyof EventMap)[] {
    return Array.from(this.eventListeners.keys());
  }

  // Emit event and collect results synchronously
  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): unknown[] {
    this.lastResults = [];
    const listenerEntries = this.getListenerEntries(event);
    const listenersToRemove: EventListenerEntry<EventMap[K]>[] = [];

    for (const entry of listenerEntries) {
      try {
        const result = entry.listener(...args);
        this.lastResults.push(result);
        
        if (entry.once) {
          listenersToRemove.push(entry);
        }
      } catch (error) {
        this.lastResults.push(error);
        
        if (entry.once) {
          listenersToRemove.push(entry);
        }
      }
    }

    // Remove once listeners
    this.removeOnceListeners(event, listenersToRemove);

    return [...this.lastResults];
  }

  // Emit event and return async iterator for results
  async* emitAsync<K extends keyof EventMap>(event: K, ...args: EventMap[K]): AsyncIterableIterator<unknown> {
    const listenerEntries = this.getListenerEntries(event);
    const listenersToRemove: EventListenerEntry<EventMap[K]>[] = [];
    const results: unknown[] = [];

    for (const entry of listenerEntries) {
      try {
        const result = await Promise.resolve(entry.listener(...args));
        results.push(result);
        yield result;
        
        if (entry.once) {
          listenersToRemove.push(entry);
        }
      } catch (error) {
        results.push(error);
        yield error;
        
        if (entry.once) {
          listenersToRemove.push(entry);
        }
      }
    }

    // Remove once listeners
    this.removeOnceListeners(event, listenersToRemove);
    this.lastResults = results;
  }

  // Emit event and collect all results asynchronously (series execution)
  async emitAsyncAll<K extends keyof EventMap>(event: K, ...args: EventMap[K]): Promise<unknown[]> {
    const results: unknown[] = [];
    
    for await (const result of this.emitAsync(event, ...args)) {
      // Results are already collected in emitAsync
    }
    
    return this.lastResults;
  }

  // Emit event and collect results asynchronously (parallel execution)
  async emitParallel<K extends keyof EventMap>(event: K, ...args: EventMap[K]): Promise<unknown[]> {
    const listenerEntries = this.getListenerEntries(event);
    const listenersToRemove: EventListenerEntry<EventMap[K]>[] = [];
    
    const promises = listenerEntries.map(async (entry) => {
      try {
        const result = await Promise.resolve(entry.listener(...args));
        
        if (entry.once) {
          listenersToRemove.push(entry);
        }
        
        return result;
      } catch (error) {
        if (entry.once) {
          listenersToRemove.push(entry);
        }
        
        return error;
      }
    });

    const results = await Promise.all(promises);
    
    // Remove once listeners
    this.removeOnceListeners(event, listenersToRemove);
    this.lastResults = results;
    
    return [...results];
  }

  // Emit until first non-undefined result (sync)
  emitUntilResult<K extends keyof EventMap>(event: K, ...args: EventMap[K]): unknown {
    const listenerEntries = this.getListenerEntries(event);
    const listenersToRemove: EventListenerEntry<EventMap[K]>[] = [];

    for (const entry of listenerEntries) {
      try {
        const result = entry.listener(...args);
        
        if (entry.once) {
          listenersToRemove.push(entry);
        }
        
        if (result !== undefined && !(result instanceof Promise)) {
          this.removeOnceListeners(event, listenersToRemove);
          return result;
        }
      } catch (error) {
        if (entry.once) {
          listenersToRemove.push(entry);
        }
        continue;
      }
    }

    this.removeOnceListeners(event, listenersToRemove);
    return undefined;
  }

  // Emit until first non-undefined result (async)
  async emitUntilResultAsync<K extends keyof EventMap>(event: K, ...args: EventMap[K]): Promise<unknown> {
    const listenerEntries = this.getListenerEntries(event);
    const listenersToRemove: EventListenerEntry<EventMap[K]>[] = [];

    for (const entry of listenerEntries) {
      try {
        const result = await Promise.resolve(entry.listener(...args));
        
        if (entry.once) {
          listenersToRemove.push(entry);
        }
        
        if (result !== undefined) {
          this.removeOnceListeners(event, listenersToRemove);
          return result;
        }
      } catch (error) {
        if (entry.once) {
          listenersToRemove.push(entry);
        }
        continue;
      }
    }

    this.removeOnceListeners(event, listenersToRemove);
    return undefined;
  }

  // Helper method to remove once listeners
  private removeOnceListeners<K extends keyof EventMap>(event: K, listenersToRemove: EventListenerEntry<EventMap[K]>[]): void {
    if (listenersToRemove.length === 0) return;
    
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const entry of listenersToRemove) {
        listeners.delete(entry as EventListenerEntry<EventMap[keyof EventMap]>);
      }
      
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  // Get last emitted results
  getLastResults(): unknown[] {
    return [...this.lastResults];
  }

  // Clear last results
  clearLastResults(): void {
    this.lastResults = [];
  }

  // Set max listeners
  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  // Get max listeners
  getMaxListeners(): number {
    return this.maxListeners;
  }

  // Prepend listener (add to beginning) - using overloads for different behavior
  prependListener<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
    return this.prependListenerInternal(event, listener, false);
  }

  // Prepend one-time listener
  prependOnceListener<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
    return this.prependListenerInternal(event, listener, true);
  }

  // Internal prepend implementation
  private prependListenerInternal<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>, once: boolean): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listeners = this.eventListeners.get(event)!;
    const newSet = new Set([{ listener: listener as EventListener<EventMap[keyof EventMap]>, once }]);
    
    for (const entry of listeners) {
      newSet.add(entry);
    }
    
    this.eventListeners.set(event, newSet);
    return this;
  }

  // TypeScript overloads for addListener (alias for on)
  addListener<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this;
  addListener<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
    return this.on(event, listener);
  }

  // TypeScript overloads for removeListener (alias for off)
  removeListener<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this;
  removeListener<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
    return this.off(event, listener);
  }

  // Convenience method overloads for backward compatibility
  emitWithResults<K extends keyof EventMap>(event: K, ...args: EventMap[K]): unknown[];
  emitWithResults<K extends keyof EventMap>(event: K, ...args: EventMap[K]): unknown[] {
    return this.emit(event, ...args);
  }

  async emitWithResultsAsync<K extends keyof EventMap>(event: K, ...args: EventMap[K]): Promise<unknown[]>;
  async emitWithResultsAsync<K extends keyof EventMap>(event: K, ...args: EventMap[K]): Promise<unknown[]> {
    return this.emitAsyncAll(event, ...args);
  }

  emitUntilResultSync<K extends keyof EventMap>(event: K, ...args: EventMap[K]): unknown;
  emitUntilResultSync<K extends keyof EventMap>(event: K, ...args: EventMap[K]): unknown {
    return this.emitUntilResult(event, ...args);
  }
}

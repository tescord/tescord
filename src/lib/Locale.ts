import { Collection } from "discord.js";
import { Identifiable } from "$types/Identifiable";
import { DisposeCallback } from "$types/DisposeCallback";
import type { DISCORD_LOCALES } from "$utils/publishInteractions";
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { extname } from "path";

// Extract base language codes from Discord locales (e.g., "en-US" -> "en", "tr" -> "tr")
export type Language = {
  [K in typeof DISCORD_LOCALES[number]]: K extends `${infer Base}-${string}` ? Base : K
}[typeof DISCORD_LOCALES[number]];

// Internal storage format with function capabilities
export interface ContentValue {
    [property: string]: ContentValue & ((...args: any[]) => string);
}

// Plain object format for input - no function endpoints
export interface PlainLocaleData {
    [property: string]: PlainLocaleData | string;
}

// Generic type to transform any object with strings into ContentValue structure
export type TransformToContentValue<T> = T extends string 
  ? ContentValue & ((...args: any[]) => string)
  : T extends Record<string, any>
    ? {
        [K in keyof T]: TransformToContentValue<T[K]> & ContentValue & ((...args: any[]) => string)
      }
    : never;

// Fixed non-circular type for plain locale input data
export interface PlainLocaleInputData {
    [key: string]: string | PlainLocaleInputData;
}

export interface LocaleConfig {
  id: string;
}

// Function to convert plain objects to ContentValue with function endpoints
function convertToContentValue<T extends PlainLocaleData>(data: T): TransformToContentValue<T> {
    const result: any = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            // Create a function that returns the string and can accept arguments for interpolation
            const func = (...args: any[]) => {
                let text = value;
                // Simple placeholder replacement: "Hello {0}, welcome to {1}" with args
                args.forEach((arg, index) => {
                    text = text.replace(`{${index}}`, String(arg));
                });
                return text;
            };
            
            // Assign the function and make it behave like ContentValue
            result[key] = Object.assign(func, {}) as ContentValue & ((...args: any[]) => string);
        } else {
            // Recursively convert nested objects
            result[key] = convertToContentValue(value) as ContentValue & ((...args: any[]) => string);
        }
    }
    
    return result as TransformToContentValue<T>;
}

export class Locale implements Identifiable {
    content = new Collection<Language, ContentValue>();
    interaction = new Collection<Language, Record<string, InteractionLocaleData>>();
    private contents = new Collection<string, { language: Language; data: PlainLocaleData }>();
    private interactions = new Collection<string, { language: Language; data: Record<string, InteractionLocaleData> }>();
    private unloaders: DisposeCallback[] = [];
    
    constructor(public config: LocaleConfig) {}
    
    get id() {
        return this.config.id;
    }

    private mergeContentsForLanguage(language: Language): ContentValue {
        const languageContents = Array.from(this.contents.values())
            .filter(item => item.language === language)
            .map(item => item.data);
        
        if (languageContents.length === 0) {
            return {} as ContentValue;
        }
        
        // Deep merge all contents for this language
        const merged = this.deepMerge(...languageContents);
        return convertToContentValue(merged);
    }

    private deepMerge(...objects: PlainLocaleData[]): PlainLocaleData {
        const result: PlainLocaleData = {};
        
        for (const obj of objects) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    result[key] = value;
                } else if (typeof value === 'object' && value !== null) {
                    if (typeof result[key] === 'object' && result[key] !== null && typeof result[key] !== 'string') {
                        result[key] = this.deepMerge(result[key] as PlainLocaleData, value);
                    } else {
                        result[key] = this.deepMerge({}, value);
                    }
                }
            }
        }
        
        return result;
    }

    private recalculateContentForLanguage(language: Language): void {
        const mergedContent = this.mergeContentsForLanguage(language);
        if (Object.keys(mergedContent).length > 0) {
            this.content.set(language, mergedContent);
        } else {
            this.content.delete(language);
        }
    }

    private extractFromPath(data: any, path: string): any {
        if (path === '$') return data;
        
        // Remove leading $ and split by dots
        const segments = path.replace(/^\$\.?/, '').split('.');
        let current = data;
        
        for (const segment of segments) {
            if (current === null || current === undefined) return undefined;
            current = current[segment];
        }
        
        return current;
    }

    private parseFileContent(filePath: string): any {
        const content = readFileSync(filePath, 'utf-8');
        const ext = extname(filePath).toLowerCase();
        
        switch (ext) {
            case '.json':
                return JSON.parse(content);
            case '.yaml':
            case '.yml':
                return parseYaml(content);
            default:
                throw new Error(`Unsupported file format: ${ext}. Supported formats: .json, .yaml, .yml`);
        }
    }

    private recalculateInteractionsForLanguage(language: Language): void {
        const languageInteractions = Array.from(this.interactions.values())
            .filter(item => item.language === language)
            .map(item => item.data);
        
        if (languageInteractions.length === 0) {
            this.interaction.delete(language);
            return;
        }
        
        // Merge all interaction data for this language
        const merged: Record<string, InteractionLocaleData> = {};
        for (const interactionData of languageInteractions) {
            Object.assign(merged, interactionData);
        }
        
        this.interaction.set(language, merged);
    }

    loadFile(cfg: {
        id: string;
        filePath: string;
        path: string;  // to root path
        language: Language;
        type: "Content" | "Interactions";
    }): DisposeCallback {
        try {
            // Parse the file content
            const fileData = this.parseFileContent(cfg.filePath);
            
            // Extract data from the specified path
            const extractedData = this.extractFromPath(fileData, cfg.path);
            
            if (!extractedData) {
                throw new Error(`No data found at path "${cfg.path}" in file "${cfg.filePath}"`);
            }

            if (cfg.type === "Content") {
                // Handle content locales - extracted data is the content for the specified language
                const contentId = `${cfg.id}_${cfg.language}`;
                this.contents.set(contentId, {
                    language: cfg.language,
                    data: extractedData as PlainLocaleData
                });
                this.recalculateContentForLanguage(cfg.language);
            } else if (cfg.type === "Interactions") {
                // Handle interaction locales - extracted data should be interaction data for the specified language
                const interactionId = `${cfg.id}_${cfg.language}`;
                this.interactions.set(interactionId, {
                    language: cfg.language,
                    data: extractedData as Record<string, InteractionLocaleData>
                });
                this.recalculateInteractionsForLanguage(cfg.language);
            }

            return () => {
                // Cleanup logic for removing loaded locale data
                if (cfg.type === "Content") {
                    const contentId = `${cfg.id}_${cfg.language}`;
                    this.contents.delete(contentId);
                    this.recalculateContentForLanguage(cfg.language);
                } else if (cfg.type === "Interactions") {
                    const interactionId = `${cfg.id}_${cfg.language}`;
                    this.interactions.delete(interactionId);
                    this.recalculateInteractionsForLanguage(cfg.language);
                }
            };
        } catch (error) {
            throw new Error(`Failed to load locale file "${cfg.filePath}": ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    addLocale(cfg: {
        id: string;
        locale: Language;
        data: PlainLocaleInputData;
    }): DisposeCallback {
        // Store the content source
        this.contents.set(cfg.id, { 
            language: cfg.locale, 
            data: cfg.data as PlainLocaleData 
        });
        
        // Recalculate merged content for this language
        this.recalculateContentForLanguage(cfg.locale);
        
        return () => {
            this.contents.delete(cfg.id);
            this.recalculateContentForLanguage(cfg.locale);
        };
    }

    addInteractionLocale(cfg: {
        id: string;
        locale: Language;
        data: CommandInteractionLocale | ContextMenuLocale;
    }): DisposeCallback {
        const currentData = this.interaction.get(cfg.locale) || {};
        // Use the id as the key instead of name for proper lookup
        currentData[cfg.id] = cfg.data;
        this.interaction.set(cfg.locale, currentData);
        
        return () => {
            const data = this.interaction.get(cfg.locale);
            if (data) {
                delete data[cfg.id];
                if (Object.keys(data).length === 0) {
                    this.interaction.delete(cfg.locale);
                } else {
                    this.interaction.set(cfg.locale, data);
                }
            }
        };
    }

    onUnload(...callbacks: DisposeCallback[]): void {
        this.unloaders.push(...callbacks);
    }

    destroy(): void {
        this.unloaders.forEach((dispose) => dispose());
        this.unloaders.length = 0;
        this.content.clear();
        this.interaction.clear();
        this.contents.clear();
        this.interactions.clear();
    }
}

export type CommandInteractionLocale = {
    names?: { [k: string]: string }; // Multiple patterns for single command translations
    description?: string; // Description of the command
    options?: { [optionName: string]: CommandInteractionLocaleOption }; // Key is the option name (from Tescord's options object keys)
}

export type CommandInteractionLocaleOption = {
    name?: string; // Localized name for the option
    description?: string; // Localized description for the option
    // Keys are the choice values (keys from Tescord's choices object), values are the localized display names
    choices?: { [choiceKey: string]: string };
}

export type ContextMenuLocale = {
    name: string; // Name of the context menu command
    description?: string; // Description of the context menu command
}

export type InteractionLocaleData = CommandInteractionLocale | ContextMenuLocale;

export type GetLocalization = Tescord.Localization;

declare global {
    namespace Tescord {
        interface Localization extends ContentValue {}
    }
}
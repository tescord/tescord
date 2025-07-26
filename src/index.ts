import path from "path";
import "./colors";

export * from "./exports";

export * from "$lib/Pack";
export * from "$lib/Tessen";
export * from "$lib/Locale";
export * from "$lib/Inspector";

export * from "$types/SlashCommand";
export * from "$types/Events";
export * from "$types/Interactions";
export * from "$types/InspectorOptions";

export const GENERATED_LOCALIZATION_PATH = path.resolve(
    __dirname,
    "../generated/localization.d.ts"
);

export const GENERATED_COMPONENTS_PATH = path.resolve(
    __dirname,
    "../generated/components.d.ts"
);
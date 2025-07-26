import fs from "fs";

const nativeTsTypes = [
    "Date",
    "Error",
    "Set"
]

if (!fs.existsSync("./node_modules/discord.js/typings/index.d.ts")) {
    console.log("[ERROR] discord.js typings found, please install discord.js typings, execute `pnpm i`");
    process.exit(1);
}

let base = fs.readFileSync("./node_modules/discord.js/typings/index.d.ts", "utf-8")
    .replace(/\/\/[^\n]+/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(/interface ClientEvents \{[^\}]+\}/)?.[0] ?? "";

let typeContent = base
    .replaceAll("[", "{")
    .replaceAll("]", "}")
    .replaceAll("ClientEvents", "TessenClientEvents")
    .replace("interface", "export interface")
    .replaceAll(/TessenClientEvents\{(["'][^\"\']+['"])\}/g, (match, m1) => {
        return match.replace(/\{/, "[")
            .replace(/\}/, "]");
    })
    ?? "";

const eventMap = Object.fromEntries([...(base.matchAll(/([a-zA-Z]+)\: (\[[^\]]+\])/g) ?? [])]
    .map(([_, key, value]) => {
        let mapKeys = [...(value.matchAll(/([a-zA-Z]+)\:/g) || [])].map(([_, key]) => key);
        return [key, mapKeys];
    }));

if (!eventMap["webhookUpdate"])
    eventMap["webhookUpdate"] = eventMap["webhooksUpdate"];

let mapContent = `export const TessenClientEventMap = ${JSON.stringify(eventMap, null, 2)}`


let blocks = typeContent
    .replace(/^[^\n]+/, "")
    .replace(/[^\n]+$/, "")
    .match(/\{[^\}]+\}/g) ?? []

let toImport: string[] = [];

for (const block of blocks) {
    const typeRegex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
    let match;
    while ((match = typeRegex.exec(block)) !== null) {
        const typeName = match[1] as any;
        if (!toImport.includes(typeName) && !nativeTsTypes.includes(typeName)) {
            toImport.push(typeName);
        }
    }
}

for (const block of blocks) {
    if (!block.includes("\n")) {
        let newBlock = block.replace("{", "{ ").replace("}", " }");
        typeContent = typeContent.replace(block, newBlock);
    }
}



fs.writeFileSync("./src/lib/types/ClientEvents.ts", `import { ${toImport.join(", ")} } from "discord.js";\n\n${typeContent}\n\n${mapContent}`, "utf-8");
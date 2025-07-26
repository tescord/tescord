export type InspectorOptions = {
    id: string;
    domain: "CurrentPack" | "AllSubPacks";
};

export type ButtonHandlerOptions = {
    id: string;
    handle: (ctx: any) => void | Promise<void>;
};

export type StringSelectMenuHandlerOptions = {
    id: string;
    handle: (ctx: any) => void | Promise<void>;
};

export type UserSelectMenuHandlerOptions = {
    id: string;
    handle: (ctx: any) => void | Promise<void>;
};

export type RoleSelectMenuHandlerOptions = {
    id: string;
    handle: (ctx: any) => void | Promise<void>;
};

export type ChannelSelectMenuHandlerOptions = {
    id: string;
    handle: (ctx: any) => void | Promise<void>;
};

export type MentionableSelectMenuHandlerOptions = {
    id: string;
    handle: (ctx: any) => void | Promise<void>;
};

export type ModalHandlerOptions = {
    id: string;
    handle: (ctx: any) => void | Promise<void>;
};

export type EmitOptions = {
    type: 'chatInput' | 'button' | 'stringSelectMenu' | 'userSelectMenu' | 'roleSelectMenu' | 'channelSelectMenu' | 'mentionableSelectMenu' | 'modal' | 'userContextMenu' | 'messageContextMenu';
    id: string;
    ctx: any;
};

export type ChatInputOptions = {
    pattern: string;
    handle: (ctx: any) => void | Promise<void>;
};
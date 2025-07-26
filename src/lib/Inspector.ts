import { generateCombinations } from "$utils/pattern";
import { DisposeCallback } from "$types/DisposeCallback";
import { ButtonHandlerOptions, ChatInputOptions, EmitOptions, InspectorOptions, ModalHandlerOptions, StringSelectMenuHandlerOptions, UserSelectMenuHandlerOptions, RoleSelectMenuHandlerOptions, ChannelSelectMenuHandlerOptions, MentionableSelectMenuHandlerOptions } from "$types/InspectorOptions";
import { ChatInputInteractionWrapper, ButtonInteractionWrapper, StringSelectMenuInteractionWrapper, UserSelectMenuInteractionWrapper, RoleSelectMenuInteractionWrapper, ChannelSelectMenuInteractionWrapper, MentionableSelectMenuInteractionWrapper, ModalInteractionWrapper, UserContextMenuInteractionWrapper, MessageContextMenuInteractionWrapper } from "$types/Interactions";

export class Inspector {
    public readonly id: string;
    public readonly domain: "CurrentPack" | "AllSubPacks";

    private chatInputCombinationsMap: Map<string, string> = new Map();
    private chatInputHandlers: Map<string, (ctx: ChatInputInteractionWrapper) => void | Promise<void>> = new Map();
    private buttonHandlers: Map<string, (ctx: ButtonInteractionWrapper) => void | Promise<void>> = new Map();
    private stringSelectMenuHandlers: Map<string, (ctx: StringSelectMenuInteractionWrapper) => void | Promise<void>> = new Map();
    private userSelectMenuHandlers: Map<string, (ctx: UserSelectMenuInteractionWrapper) => void | Promise<void>> = new Map();
    private roleSelectMenuHandlers: Map<string, (ctx: RoleSelectMenuInteractionWrapper) => void | Promise<void>> = new Map();
    private channelSelectMenuHandlers: Map<string, (ctx: ChannelSelectMenuInteractionWrapper) => void | Promise<void>> = new Map();
    private mentionableSelectMenuHandlers: Map<string, (ctx: MentionableSelectMenuInteractionWrapper) => void | Promise<void>> = new Map();
    private modalHandlers: Map<string, (ctx: ModalInteractionWrapper) => void | Promise<void>> = new Map();
    private userContextMenuHandlers: Map<string, (ctx: UserContextMenuInteractionWrapper) => void | Promise<void>> = new Map();
    private messageContextMenuHandlers: Map<string, (ctx: MessageContextMenuInteractionWrapper) => void | Promise<void>> = new Map();

    constructor(options: InspectorOptions) {
        this.id = options.id;
        this.domain = options.domain;
    }

    async emit(options: EmitOptions): Promise<boolean | void> {
        const { type, id, ctx } = options;
        try {
            switch (type) {
                case 'chatInput':
                    // Look up the original pattern that this ID is a combination of
                    const originalPattern = this.chatInputCombinationsMap.get(id);
                    if (originalPattern) {
                        const handler = this.chatInputHandlers.get(originalPattern);
                        if (handler) {
                            return await handler(ctx);
                        }
                    }
                    break;
                    
                case 'button':
                    const buttonHandler = this.buttonHandlers.get(id);
                    if (buttonHandler) {
                        return await buttonHandler(ctx);
                    }
                    break;
                    
                case 'stringSelectMenu':
                    const stringSelectMenuHandler = this.stringSelectMenuHandlers.get(id);
                    if (stringSelectMenuHandler) {
                        return await stringSelectMenuHandler(ctx);
                    }
                    break;

                case 'userSelectMenu':
                    const userSelectMenuHandler = this.userSelectMenuHandlers.get(id);
                    if (userSelectMenuHandler) {
                        return await userSelectMenuHandler(ctx);
                    }
                    break;

                case 'roleSelectMenu':
                    const roleSelectMenuHandler = this.roleSelectMenuHandlers.get(id);
                    if (roleSelectMenuHandler) {
                        return await roleSelectMenuHandler(ctx);
                    }
                    break;

                case 'channelSelectMenu':
                    const channelSelectMenuHandler = this.channelSelectMenuHandlers.get(id);
                    if (channelSelectMenuHandler) {
                        return await channelSelectMenuHandler(ctx);
                    }
                    break;

                case 'mentionableSelectMenu':
                    const mentionableSelectMenuHandler = this.mentionableSelectMenuHandlers.get(id);
                    if (mentionableSelectMenuHandler) {
                        return await mentionableSelectMenuHandler(ctx);
                    }
                    break;
                    
                case 'modal':
                    const modalHandler = this.modalHandlers.get(id);
                    if (modalHandler) {
                        return await modalHandler(ctx);
                    }
                    break;

                case 'userContextMenu':
                    const userContextMenuHandler = this.userContextMenuHandlers.get(id);
                    if (userContextMenuHandler) {
                        return await userContextMenuHandler(ctx);
                    }
                    break;

                case 'messageContextMenu':
                    const messageContextMenuHandler = this.messageContextMenuHandlers.get(id);
                    if (messageContextMenuHandler) {
                        return await messageContextMenuHandler(ctx);
                    }
                    break;
                    
                default:
            }
        } catch {}
        
        return;
    }

    chatInput(options: ChatInputOptions): DisposeCallback {
        const { pattern, handle } = options;
        
        this.chatInputHandlers.set(pattern, handle);
        
        const combinations = generateCombinations(pattern);
        
        for (const combo of combinations) {
            this.chatInputCombinationsMap.set(combo, pattern);
        }

        return () => {
            for (const combo of combinations) {
                this.chatInputCombinationsMap.delete(combo);
            }
            
            this.chatInputHandlers.delete(pattern);
        };
    }

    button(options: ButtonHandlerOptions): DisposeCallback {
        this.buttonHandlers.set(options.id, options.handle);

        return () => {
            this.buttonHandlers.delete(options.id);
        };
    }

    stringSelectMenu(options: StringSelectMenuHandlerOptions): DisposeCallback {
        this.stringSelectMenuHandlers.set(options.id, options.handle);

        return () => {
            this.stringSelectMenuHandlers.delete(options.id);
        };
    }

    userSelectMenu(options: UserSelectMenuHandlerOptions): DisposeCallback {
        this.userSelectMenuHandlers.set(options.id, options.handle);

        return () => {
            this.userSelectMenuHandlers.delete(options.id);
        };
    }

    roleSelectMenu(options: RoleSelectMenuHandlerOptions): DisposeCallback {
        this.roleSelectMenuHandlers.set(options.id, options.handle);

        return () => {
            this.roleSelectMenuHandlers.delete(options.id);
        };
    }

    channelSelectMenu(options: ChannelSelectMenuHandlerOptions): DisposeCallback {
        this.channelSelectMenuHandlers.set(options.id, options.handle);

        return () => {
            this.channelSelectMenuHandlers.delete(options.id);
        };
    }

    mentionableSelectMenu(options: MentionableSelectMenuHandlerOptions): DisposeCallback {
        this.mentionableSelectMenuHandlers.set(options.id, options.handle);

        return () => {
            this.mentionableSelectMenuHandlers.delete(options.id);
        };
    }

    modal(options: ModalHandlerOptions): DisposeCallback {
        this.modalHandlers.set(options.id, options.handle);

        return () => {
            this.modalHandlers.delete(options.id);
        };
    }

    userContextMenu(options: { id: string; handle: (ctx: UserContextMenuInteractionWrapper) => void | Promise<void> }): DisposeCallback {
        this.userContextMenuHandlers.set(options.id, options.handle);

        return () => {
            this.userContextMenuHandlers.delete(options.id);
        };
    }

    messageContextMenu(options: { id: string; handle: (ctx: MessageContextMenuInteractionWrapper) => void | Promise<void> }): DisposeCallback {
        this.messageContextMenuHandlers.set(options.id, options.handle);

        return () => {
            this.messageContextMenuHandlers.delete(options.id);
        };
    }
}
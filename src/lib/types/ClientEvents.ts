import { ApplicationCommandPermissionsUpdateData, AutoModerationActionExecution, AutoModerationRule, NonThreadGuildBasedChannel, DMChannel, TextBasedChannel, GuildEmoji, Entitlement, GuildAuditLogsEntry, Guild, GuildBan, GuildMember, PartialGuildMember, ReadonlyCollection, Snowflake, GuildMembersChunk, GuildSoundboardSound, PartialSoundboardSound, Invite, OmitPartialGroupDMChannel, Message, PartialMessage, PollAnswer, MessageReaction, PartialMessageReaction, GuildTextBasedChannel, User, PartialUser, MessageReactionEventDetails, Presence, Client, Role, AnyThreadChannel, ThreadMember, PartialThreadMember, Typing, VoiceChannelEffect, VoiceState, TextChannel, NewsChannel, VoiceChannel, ForumChannel, MediaChannel, Interaction, CloseEvent, StageInstance, Sticker, Subscription, GuildScheduledEvent, PartialGuildScheduledEvent } from "discord.js";

export interface TessenClientEvents {
  applicationCommandPermissionsUpdate: { data: ApplicationCommandPermissionsUpdateData };
  autoModerationActionExecution: { autoModerationActionExecution: AutoModerationActionExecution };
  autoModerationRuleCreate: { autoModerationRule: AutoModerationRule };
  autoModerationRuleDelete: { autoModerationRule: AutoModerationRule };
  autoModerationRuleUpdate: {
    oldAutoModerationRule: AutoModerationRule | null,
    newAutoModerationRule: AutoModerationRule,
  };
  cacheSweep: { message: string };
  channelCreate: { channel: NonThreadGuildBasedChannel };
  channelDelete: { channel: DMChannel | NonThreadGuildBasedChannel };
  channelPinsUpdate: { channel: TextBasedChannel, date: Date };
  channelUpdate: {
    oldChannel: DMChannel | NonThreadGuildBasedChannel,
    newChannel: DMChannel | NonThreadGuildBasedChannel,
  };
  debug: { message: string };
  warn: { message: string };
  emojiCreate: { emoji: GuildEmoji };
  emojiDelete: { emoji: GuildEmoji };
  emojiUpdate: { oldEmoji: GuildEmoji, newEmoji: GuildEmoji };
  entitlementCreate: { entitlement: Entitlement };
  entitlementDelete: { entitlement: Entitlement };
  entitlementUpdate: { oldEntitlement: Entitlement | null, newEntitlement: Entitlement };
  error: { error: Error };
  guildAuditLogEntryCreate: { auditLogEntry: GuildAuditLogsEntry, guild: Guild };
  guildAvailable: { guild: Guild };
  guildBanAdd: { ban: GuildBan };
  guildBanRemove: { ban: GuildBan };
  guildCreate: { guild: Guild };
  guildDelete: { guild: Guild };
  guildUnavailable: { guild: Guild };
  guildIntegrationsUpdate: { guild: Guild };
  guildMemberAdd: { member: GuildMember };
  guildMemberAvailable: { member: GuildMember | PartialGuildMember };
  guildMemberRemove: { member: GuildMember | PartialGuildMember };
  guildMembersChunk: { members: ReadonlyCollection<Snowflake, GuildMember>, guild: Guild, data: GuildMembersChunk };
  guildMemberUpdate: { oldMember: GuildMember | PartialGuildMember, newMember: GuildMember };
  guildUpdate: { oldGuild: Guild, newGuild: Guild };
  guildSoundboardSoundCreate: { soundboardSound: GuildSoundboardSound };
  guildSoundboardSoundDelete: { soundboardSound: GuildSoundboardSound | PartialSoundboardSound };
  guildSoundboardSoundUpdate: {
    oldSoundboardSound: GuildSoundboardSound | null,
    newSoundboardSound: GuildSoundboardSound,
  };
  guildSoundboardSoundsUpdate: { soundboardSounds: ReadonlyCollection<Snowflake, GuildSoundboardSound>, guild: Guild };
  inviteCreate: { invite: Invite };
  inviteDelete: { invite: Invite };
  messageCreate: { message: OmitPartialGroupDMChannel<Message> };
  messageDelete: { message: OmitPartialGroupDMChannel<Message | PartialMessage> };
  messagePollVoteAdd: { pollAnswer: PollAnswer, userId: Snowflake };
  messagePollVoteRemove: { pollAnswer: PollAnswer, userId: Snowflake };
  messageReactionRemoveAll: {
    message: OmitPartialGroupDMChannel<Message | PartialMessage>,
    reactions: ReadonlyCollection<string | Snowflake, MessageReaction>,
  };
  messageReactionRemoveEmoji: { reaction: MessageReaction | PartialMessageReaction };
  messageDeleteBulk: {
    messages: ReadonlyCollection<Snowflake, OmitPartialGroupDMChannel<Message | PartialMessage>>,
    channel: GuildTextBasedChannel,
  };
  messageReactionAdd: {
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    details: MessageReactionEventDetails,
  };
  messageReactionRemove: {
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    details: MessageReactionEventDetails,
  };
  messageUpdate: {
    oldMessage: OmitPartialGroupDMChannel<Message | PartialMessage>,
    newMessage: OmitPartialGroupDMChannel<Message>,
  };
  presenceUpdate: { oldPresence: Presence | null, newPresence: Presence };
  ready: { client: Client<true> };
  invalidated: {};
  roleCreate: { role: Role };
  roleDelete: { role: Role };
  roleUpdate: { oldRole: Role, newRole: Role };
  threadCreate: { thread: AnyThreadChannel, newlyCreated: boolean };
  threadDelete: { thread: AnyThreadChannel };
  threadListSync: { threads: ReadonlyCollection<Snowflake, AnyThreadChannel>, guild: Guild };
  threadMemberUpdate: { oldMember: ThreadMember, newMember: ThreadMember };
  threadMembersUpdate: {
    addedMembers: ReadonlyCollection<Snowflake, ThreadMember>,
    removedMembers: ReadonlyCollection<Snowflake, ThreadMember | PartialThreadMember>,
    thread: AnyThreadChannel,
  };
  threadUpdate: { oldThread: AnyThreadChannel, newThread: AnyThreadChannel };
  typingStart: { typing: Typing };
  userUpdate: { oldUser: User | PartialUser, newUser: User };
  voiceChannelEffectSend: { voiceChannelEffect: VoiceChannelEffect };
  voiceStateUpdate: { oldState: VoiceState, newState: VoiceState };
  
  webhookUpdate: TessenClientEvents['webhooksUpdate'];
  webhooksUpdate: { channel: TextChannel | NewsChannel | VoiceChannel | ForumChannel | MediaChannel };
  interactionCreate: { interaction: Interaction };
  shardDisconnect: { closeEvent: CloseEvent, shardId: number };
  shardError: { error: Error, shardId: number };
  shardReady: { shardId: number, unavailableGuilds: Set<Snowflake> | undefined };
  shardReconnecting: { shardId: number };
  shardResume: { shardId: number, replayedEvents: number };
  stageInstanceCreate: { stageInstance: StageInstance };
  stageInstanceUpdate: { oldStageInstance: StageInstance | null, newStageInstance: StageInstance };
  stageInstanceDelete: { stageInstance: StageInstance };
  stickerCreate: { sticker: Sticker };
  stickerDelete: { sticker: Sticker };
  stickerUpdate: { oldSticker: Sticker, newSticker: Sticker };
  subscriptionCreate: { subscription: Subscription };
  subscriptionDelete: { subscription: Subscription };
  subscriptionUpdate: { oldSubscription: Subscription | null, newSubscription: Subscription };
  guildScheduledEventCreate: { guildScheduledEvent: GuildScheduledEvent };
  guildScheduledEventUpdate: {
    oldGuildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent | null,
    newGuildScheduledEvent: GuildScheduledEvent,
  };
  guildScheduledEventDelete: { guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent };
  guildScheduledEventUserAdd: { guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent, user: User };
  guildScheduledEventUserRemove: { guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent, user: User };
  soundboardSounds: { soundboardSounds: ReadonlyCollection<Snowflake, GuildSoundboardSound>, guild: Guild };
}

export const TessenClientEventMap = {
  "applicationCommandPermissionsUpdate": [
    "data"
  ],
  "autoModerationActionExecution": [
    "autoModerationActionExecution"
  ],
  "autoModerationRuleCreate": [
    "autoModerationRule"
  ],
  "autoModerationRuleDelete": [
    "autoModerationRule"
  ],
  "autoModerationRuleUpdate": [
    "oldAutoModerationRule",
    "newAutoModerationRule"
  ],
  "cacheSweep": [
    "message"
  ],
  "channelCreate": [
    "channel"
  ],
  "channelDelete": [
    "channel"
  ],
  "channelPinsUpdate": [
    "channel",
    "date"
  ],
  "channelUpdate": [
    "oldChannel",
    "newChannel"
  ],
  "debug": [
    "message"
  ],
  "warn": [
    "message"
  ],
  "emojiCreate": [
    "emoji"
  ],
  "emojiDelete": [
    "emoji"
  ],
  "emojiUpdate": [
    "oldEmoji",
    "newEmoji"
  ],
  "entitlementCreate": [
    "entitlement"
  ],
  "entitlementDelete": [
    "entitlement"
  ],
  "entitlementUpdate": [
    "oldEntitlement",
    "newEntitlement"
  ],
  "error": [
    "error"
  ],
  "guildAuditLogEntryCreate": [
    "auditLogEntry",
    "guild"
  ],
  "guildAvailable": [
    "guild"
  ],
  "guildBanAdd": [
    "ban"
  ],
  "guildBanRemove": [
    "ban"
  ],
  "guildCreate": [
    "guild"
  ],
  "guildDelete": [
    "guild"
  ],
  "guildUnavailable": [
    "guild"
  ],
  "guildIntegrationsUpdate": [
    "guild"
  ],
  "guildMemberAdd": [
    "member"
  ],
  "guildMemberAvailable": [
    "member"
  ],
  "guildMemberRemove": [
    "member"
  ],
  "guildMembersChunk": [
    "members",
    "guild",
    "data"
  ],
  "guildMemberUpdate": [
    "oldMember",
    "newMember"
  ],
  "guildUpdate": [
    "oldGuild",
    "newGuild"
  ],
  "guildSoundboardSoundCreate": [
    "soundboardSound"
  ],
  "guildSoundboardSoundDelete": [
    "soundboardSound"
  ],
  "guildSoundboardSoundUpdate": [
    "oldSoundboardSound",
    "newSoundboardSound"
  ],
  "guildSoundboardSoundsUpdate": [
    "soundboardSounds",
    "guild"
  ],
  "inviteCreate": [
    "invite"
  ],
  "inviteDelete": [
    "invite"
  ],
  "messageCreate": [
    "message"
  ],
  "messageDelete": [
    "message"
  ],
  "messagePollVoteAdd": [
    "pollAnswer",
    "userId"
  ],
  "messagePollVoteRemove": [
    "pollAnswer",
    "userId"
  ],
  "messageReactionRemoveAll": [
    "message",
    "reactions"
  ],
  "messageReactionRemoveEmoji": [
    "reaction"
  ],
  "messageDeleteBulk": [
    "messages",
    "channel"
  ],
  "messageReactionAdd": [
    "reaction",
    "user",
    "details"
  ],
  "messageReactionRemove": [
    "reaction",
    "user",
    "details"
  ],
  "messageUpdate": [
    "oldMessage",
    "newMessage"
  ],
  "presenceUpdate": [
    "oldPresence",
    "newPresence"
  ],
  "ready": [
    "client"
  ],
  "roleCreate": [
    "role"
  ],
  "roleDelete": [
    "role"
  ],
  "roleUpdate": [
    "oldRole",
    "newRole"
  ],
  "threadCreate": [
    "thread",
    "newlyCreated"
  ],
  "threadDelete": [
    "thread"
  ],
  "threadListSync": [
    "threads",
    "guild"
  ],
  "threadMemberUpdate": [
    "oldMember",
    "newMember"
  ],
  "threadMembersUpdate": [
    "addedMembers",
    "removedMembers",
    "thread"
  ],
  "threadUpdate": [
    "oldThread",
    "newThread"
  ],
  "typingStart": [
    "typing"
  ],
  "userUpdate": [
    "oldUser",
    "newUser"
  ],
  "voiceChannelEffectSend": [
    "voiceChannelEffect"
  ],
  "voiceStateUpdate": [
    "oldState",
    "newState"
  ],
  "webhooksUpdate": [
    "channel"
  ],
  "interactionCreate": [
    "interaction"
  ],
  "shardDisconnect": [
    "closeEvent",
    "shardId"
  ],
  "shardError": [
    "error",
    "shardId"
  ],
  "shardReady": [
    "shardId",
    "unavailableGuilds"
  ],
  "shardReconnecting": [
    "shardId"
  ],
  "shardResume": [
    "shardId",
    "replayedEvents"
  ],
  "stageInstanceCreate": [
    "stageInstance"
  ],
  "stageInstanceUpdate": [
    "oldStageInstance",
    "newStageInstance"
  ],
  "stageInstanceDelete": [
    "stageInstance"
  ],
  "stickerCreate": [
    "sticker"
  ],
  "stickerDelete": [
    "sticker"
  ],
  "stickerUpdate": [
    "oldSticker",
    "newSticker"
  ],
  "subscriptionCreate": [
    "subscription"
  ],
  "subscriptionDelete": [
    "subscription"
  ],
  "subscriptionUpdate": [
    "oldSubscription",
    "newSubscription"
  ],
  "guildScheduledEventCreate": [
    "guildScheduledEvent"
  ],
  "guildScheduledEventUpdate": [
    "oldGuildScheduledEvent",
    "newGuildScheduledEvent"
  ],
  "guildScheduledEventDelete": [
    "guildScheduledEvent"
  ],
  "guildScheduledEventUserAdd": [
    "guildScheduledEvent",
    "user"
  ],
  "guildScheduledEventUserRemove": [
    "guildScheduledEvent",
    "user"
  ],
  "soundboardSounds": [
    "soundboardSounds",
    "guild"
  ],
  "webhookUpdate": [
    "channel"
  ]
}
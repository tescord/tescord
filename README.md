# Tescord – The Official Discord Framework Continuing Where Tessen Left Off

A Discord.js based library for creating bots with a syntax similar to Express.js. Tescord allows for easy creation of packs, inspectors, and locales, and supports chat commands, slash commands, and interaction handling.

> ⚠️ **Development Notice**: This module is currently in development and is not yet ready for production use.

## Features

### 🎒 **Packs**
Create and manage modular packs of commands and interactions with easy composition and lifecycle management.

### 🔍 **Inspectors** 
Handle chat inputs and interactions with a simple, pattern-based API that supports regex-like matching.

### 🌐 **Locales**
Comprehensive localization system supporting both content and interaction-specific translations with automatic locale detection.

### 🎛️ **Components**
Built-in component builder with custom data encoding for buttons, select menus, and modals.

### ⚡ **Performance Optimized**
Single-map event and interaction handling for maximum performance.

## Installation

```bash
npm install Tescord
```

## Quick Start

```typescript
import { Tescord, Pack, Inspector, Locale } from 'Tescord';

// Initialize Tescord with client configuration
const Tescord = new Tescord({
  id: 'MyBot',
  clients: [{
    id: 'main',
    options: { intents: ['GuildMessages', 'Guilds'] },
    token: 'YOUR_BOT_TOKEN'
  }]
});

// Create a pack
const pack = new Pack({ id: 'ExamplePack' });

// Add slash command
pack.slashCommand({
  id: 'hello',
  name: 'hello (world|universe)?',
  description: 'A friendly greeting command',
  handle: async (ctx) => {
    await ctx.interaction.reply({
      content: `Hello ${ctx.interaction.commandName.includes('world') ? 'World' : 'Universe'}!`,
      ephemeral: true
    });
  }
});

// Use the pack
Tescord.use(pack);

// Start the bot
await Tescord.start();
```

## Core Concepts

### Packs

Packs are modular containers for commands, interactions, and other resources:

```typescript
const pack = new Pack({ id: 'MyPack' });

// Slash commands with pattern matching
pack.slashCommand({
  id: 'config',
  name: 'config (set|get|reset) (prefix|welcome)',
  description: 'Configure bot settings',
  handle: async (ctx) => {
    // ctx.commandName will be one of: 
    // "config set prefix", "config get prefix", etc.
  },
  options: {
    value: {
      description: 'The value to set',
      type: 'String',
      required: false
    }
  }
});

// Context menu commands
pack.userContextMenu({
  id: 'user-info',
  name: 'Get User Info',
  handle: async (ctx) => {
    const user = ctx.interaction.targetUser;
    await ctx.interaction.reply(`User: ${user.tag}`);
  }
});

// Component interactions
pack.button({
  id: 'confirm-action',
  handle: async (ctx) => {
    // ctx.data contains any custom data passed to buildComponent
    await ctx.interaction.reply('Action confirmed!');
  },
  options: {
    label: 'Confirm',
    style: 'Success',
    emoji: '✅'
  }
});
```

### Inspectors

Inspectors provide pattern-based handling for interactions:

```typescript
const inspector = new Inspector({ 
  id: 'CommandInspector',
  domain: "CurrentPack|AllSubPacks" 
});

// Pattern matching for chat inputs
inspector.chatInput({
  pattern: 'system (start|stop|restart) (server|database)',
  handle: async (ctx) => {
    // Handles combinations like:
    // - "system start server"
    // - "system stop database"
    // etc.
  }
});

// Component handling
inspector.button({
  id: 'dynamic-button-*', // Wildcard matching
  handle: async (ctx) => {
    // Handle any button starting with "dynamic-button-"
  }
});

pack.use(inspector);
```

### Localization

Comprehensive localization system:

```typescript
const locale = new Locale({ id: 'MyLocales' });

// Load from files
locale.loadFile({
  filePath: 'locales/en.json',
  path: '$',
  language: 'en',
  type: "Content"
});

locale.loadFile({
  filePath: 'locales/tr.yaml',
  path: '$.interactions',
  language: 'tr',
  type: "Interactions"
});

// Direct locale addition
locale.addLocale({
  id: "welcome",
  locale: "en",
  data: {
    title: "Welcome!",
    message: "Hello {username}!"
  }
});

// In handlers, locales are automatically resolved
pack.slashCommand({
  id: 'greet',
  name: 'greet',
  description: 'Greet a user',
  handle: async (ctx) => {
    // ctx.locale.guild - Guild's preferred locale
    // ctx.locale.user - User's preferred locale
    await ctx.interaction.reply(ctx.locale.user.welcome.message);
  }
});
```

### Component Building

Build components with custom data encoding:

```typescript
pack.button({
  id: 'vote-button',
  handle: async (ctx) => {
    const [pollId, optionId] = ctx.data; // Automatically parsed
    await ctx.interaction.reply(`Voted for option ${optionId} in poll ${pollId}`);
  },
  options: {
    label: 'Vote',
    style: 'Primary'
  }
});

// Later, build the component with data
const voteButton = Tescord.buildComponent({
  id: 'vote-button',
  data: ['poll-123', 'option-a'], // Custom data encoded in customId
  overrides: {
    label: 'Vote for Option A'
  }
});

// Use in message
await interaction.reply({
  content: 'Choose your option:',
  components: [{
    type: 1,
    components: [voteButton]
  }]
});
```

### Advanced Slash Commands

Rich slash command options with autocomplete:

```typescript
pack.slashCommand({
  id: 'search',
  name: 'search',
  description: 'Search for content',
  options: {
    query: {
      description: 'Search query',
      type: 'String',
      required: true,
      minLength: 2,
      maxLength: 100
    },
    category: {
      description: 'Search category',
      type: 'String',
      required: false,
      choices: {
        'music': 'Music',
        'videos': 'Videos',
        'images': 'Images'
      }
    },
    suggestions: {
      description: 'Dynamic suggestions',
      type: 'String',
      required: false,
      autoComplete: async (ctx) => {
        // ctx.value contains the current input
        const results = await searchAPI(ctx.value);
        return results.reduce((acc, item) => {
          acc[item.id] = item.name;
          return acc;
        }, {});
      }
    }
  },
  handle: async (ctx) => {
    const query = ctx.interaction.options.getString('query', true);
    // Handle search...
  }
});
```

### Event Handling

Handle Discord.js events:

```typescript
pack.event({
  event: 'messageCreate',
  handle: async (ctx) => {
    // ctx.message contains the message
    // ctx.locale provides localization
    if (ctx.message.content.startsWith('!ping')) {
      await ctx.message.reply('Pong!');
    }
  }
});

pack.event({
  event: 'guildMemberAdd',
  handle: async (ctx) => {
    // Welcome new members
    const welcomeChannel = ctx.guild.channels.cache.find(c => c.name === 'welcome');
    if (welcomeChannel) {
      await welcomeChannel.send(`Welcome ${ctx.member}!`);
    }
  }
});
```

### Multiple Clients

Support for multiple Discord clients:

```typescript
const Tescord = new Tescord({
  id: 'MultiBot',
  clients: [
    {
      id: 'main-bot',
      options: { intents: ['GuildMessages', 'Guilds'] },
      token: 'MAIN_BOT_TOKEN'
    },
    {
      id: 'admin-bot',
      options: { intents: ['GuildMessages', 'GuildMembers'] },
      token: 'ADMIN_BOT_TOKEN'
    }
  ]
});

// Target specific client
pack.slashCommand({
  id: 'admin-command',
  name: 'admin',
  description: 'Admin only command',
  clientId: 'admin-bot', // Only register on admin bot
  handle: async (ctx) => {
    // This only runs on the admin bot
  }
});
```

## API Reference

### Tescord Class

Main class that extends Pack with client management:

```typescript
class Tescord<ID extends string = string> extends Pack {
  constructor(config: TescordConfig<ID>)
  
  // Client management
  refreshClients(): void
  start(): Promise<void>
  publish(): Promise<void>
  
  // Component building
  buildComponent<T extends ValidComponentId>(config: ComponentBuildConfig<T>): BuiltComponent
}
```

### Pack Class

Container for commands and interactions:

```typescript
class Pack<Config extends PackConfig = PackConfig, TescordId extends string = string> {
  constructor(config: Config)
  
  // Resource management
  use(...args: Usable[]): DisposeCallback
  unload(...callbacks: DisposeCallback[]): void
  destroy(): void
  
  // Command registration
  slashCommand<T extends string>(cfg: SlashCommandRegistrationConfig<T, TescordId>): DisposeCallback
  userContextMenu<T extends string>(cfg: UserContextMenuRegistrationConfig<T, TescordId>): DisposeCallback
  messageContextMenu<T extends string>(cfg: MessageContextMenuRegistrationConfig<T, TescordId>): DisposeCallback
  
  // Component registration
  button(cfg: ButtonRegistrationConfig): DisposeCallback
  stringSelectMenu(cfg: StringSelectMenuRegistrationConfig): DisposeCallback
  userSelectMenu(cfg: UserSelectMenuRegistrationConfig): DisposeCallback
  roleSelectMenu(cfg: RoleSelectMenuRegistrationConfig): DisposeCallback
  channelSelectMenu(cfg: ChannelSelectMenuRegistrationConfig): DisposeCallback
  mentionableSelectMenu(cfg: MentionableSelectMenuRegistrationConfig): DisposeCallback
  modal(cfg: ModalRegistrationConfig): DisposeCallback
  
  // Event handling
  event(cfg: AnyEventRegistrationConfig): DisposeCallback
}
```

### Inspector Class

Pattern-based interaction handler:

```typescript
class Inspector {
  constructor(config: InspectorConfig)
  
  // Pattern-based handlers
  chatInput(cfg: ChatInputInspectorConfig): DisposeCallback
  button(cfg: ButtonInspectorConfig): DisposeCallback
  // ... other interaction types
  
  // Manual emission
  emit(cfg: EmitConfig): Promise<unknown>
}
```

### Locale Class

Localization management:

```typescript
class Locale {
  constructor(config: LocaleConfig)
  
  // File loading
  loadFile(cfg: LoadFileConfig): DisposeCallback
  
  // Direct locale management
  addLocale(cfg: AddLocaleConfig): DisposeCallback
  addInteractionLocale(cfg: AddInteractionLocaleConfig): DisposeCallback
}
```

## Design Principles

- **Type Safety**: Strict TypeScript typing throughout
- **Performance**: Single-map event handling for optimal performance
- **Modularity**: Pack-based architecture for code organization
- **Flexibility**: Support for multiple patterns and use cases
- **Developer Experience**: Express.js-like syntax for familiarity

## Contributing

This project is in active development. Contributions, issues, and feature requests are welcome!

## License

MIT License - see LICENSE file for details.

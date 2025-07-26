This is a module which is in development. It is not yet ready for production use.

# Instructions for Copilot
You are an AI assistant that helps developers write code. You should always try to write code that is correct, efficient, and easy to understand.
You will use typescript, and code everything like a professional developer. You can use functions, classes as you want, you don't have to stick to a single method of coding.

# Module Details
Module name: Tessen
Module description: Tessen is a Discord.js based library for creating bots, with a syntax similar to Express.js. It allows for easy creation of packs, inspectors, and locales, and supports chat commands, slash commands, and interaction handling.
Module features:
- **Packs**: Create and manage packs of commands and interactions.
- **Inspectors**: Handle chat inputs and interactions with a simple API.
- **Locales**: Manage localization files and interaction locales.

# Methodolgies

- Use object-based parameters for methods instead of string+function overloads.
- For better performance, map every event and interaction to a single map, for handling to be faster.
- Use PascalCase for constants.
- Don't use enums, use string arrays generaly. If a discord.js enum is provided, convert it to string array if necessery.
- Don't write repetitive code, use functions to generate similar code. Or for typings, use mapped types or generics etc.
- Don't write inner functions, write function in the global scope.
- Code every typing strictly. Don't use `any` type, use specific types or generics.

# Example
```ts
// tessen is a discord.js based library for creating bots
// tessen syntax is similar to express.js
import { Tessen, Pack, Inspector, Locale } from 'tessen';
// tessen pack'in extendidir
const tessen = new Tessen();

const pack = new Pack({ id: 'ExamplePack' });
const inspector = new Inspector({ id: 'ExampleInspector', domain: "CurrentPack|AllSubPacks" });
const locales = new Locale({ id: 'ExampleLocales' });

pack.onUnload(
  locales.loadFile({
    filePath: 'example.json',
    path: '$',
    language: 'en',
    type: "Content"
  }),
  locales.loadFile({
    filePath: 'tr.yaml',
    path: '$.interactions',
    language: 'tr',
    // this path should has something like this:
    // interactions:
    //   hello-world-command-id:
    //     names:
    //       hello: 'merhaba'
    //       world: 'dünya'
    //     description: 'A hello world command'
    // ... etc.

    type: "Interactions"
  }),
  locales.addLocale({
    id: "Example2",
    locale: "",
    data: {}
  }),
  locales.addInteractionLocale({
    id: "Example3",
    locale: "",
    data: {}
  })
)


const pattern = 'system (set|unset) settings';
pack.event({
  id: 'someId',
  name: 'messageCreate',
  handle: (ctx) => {
    // Handler code
    ctx.message;
    ctx.message.reply({
      content: ctx.locale.guild.blabla.blabla()
    });
  }
})

// Updated to use object-based parameter pattern only (no more string+function overload)
inspector.chatInput({
  pattern: 'system (set|unset) settings',
  handle: (ctx) => {
    // Handler code
    // for interactions, ctx.locale.user is also available
    // ctx.
  }
});  // () => { } // unloader

// Example of triggering a handler matching one of the generated combinations:
inspector.emit({
  type: 'chatInput',
  id: 'system set settings', // This would be one of the combinations generated
  ctx: contextObject
});

inspector.button({
  id: "", // we don't need name here, because we can use id for also custom id for discord.
  handle(ctx) {

  }
})

pack.use(inspector);  // () => { } // unloader
pack.use(locales);  // () => { } // unloader

tessen.use(pack);  // () => { } // unloader

// example extension usage
tessen.use(chatCommandExtension({
  prefix: "!"
}))
tessen.slashCommand({
  id: 'example', // id is not related to discord, it is just an identifier for the command for tessen to use
  name: 'example (command|kommand)?', // this will generate multiple command name combinations, like 'example', 'example command', 'example kommand', etc., same command will be publish to all combination names
  description: 'an example command',
  handle: (ctx) => {
    ctx.interaction.reply({
      content: 'Hello world',
      ephemeral: true
    })
  },
  options: {
    option1: { // here key is for option name, and value is the option object
      description: 'an example option',
      type: 'String', // do not include subcommand and subcommand group options here, they are handled name pattern of the slash command
      required: true
    },
    option2: {
      description: 'another example option',
      type: 'Integer',
      required: false,
      choices: {
        1: 'Choice 1', // key is the value, value is the name, this is also viable for localization
        2: 'Choice 2',
        3: 'Choice 3'
      }
    },
    option3: {
      description: 'a autocomplete option',
      type: 'Integer',
      required: false,
      autoComplete: async (ctx) => {
        ctx.value; // The current value user is typing
        return {
          1: 'Choice 1',
          2: 'Choice 2',
          3: 'Choice 3'
        }
      }
    }
  }
}); // () => { } // unloader


pack.button({
  id: 'example-button',
  handle: (ctx) => {
    ctx.interaction.reply({
      content: 'Button clicked!',
      components: [
        {
          type: 1,
          components: [
            tessen.buildComponent({
              id: 'example-button',
              overrides: {
                label: 'Click me!',
                style: 'Primary'
              },
              data: [ // data will be appended to the interaction's custom id, and retrieved in the handler, and will be supplied to the wrapped context
                "some string",
                123 // some number
              ]
            })
          ]
        }
      ],
      ephemeral: true
    });
  },
  options: {
    label: 'Example Button',
    style: 'Primary', // or 'Secondary', 'Success', 'Danger', 'Link'
    disabled: false, // optional, default is false
    emoji: '👍'
  }
})
tessen.start();
```
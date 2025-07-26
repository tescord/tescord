// tescord is a discord.js based library for creating bots
// tescord syntax is similar to express.js
import { Tescord, Pack, Inspector, Locales } from 'tescord';
// tescord pack'in extendidir
const tescord = new Tescord();

const pack = new Pack({ id: 'ExamplePack' });
const inspector = new Inspector({ id: 'ExampleInspector', domain: "CurrentPack|AllSubPacks" });
const locales = new Locales({ id: 'ExampleLocales', domain: "CurrentPack|AllSubPacks" });

pack.onUnload(
  locales.loadFile({
    id: 'Example',
    filePath: 'example.json',
    path: '$',
    type: "Content"
  }),
  locales.addLocale({
    id: "Example2",
    locale: "",
    data: {}
  }),
  locales.addInteractionLocale({
    id: "Example3",
    locale: "",
    name: "system set settings",
    data: {}
  })
)


const pattern = 'system (set|unset) settings';
pack.event({

})

// Updated to use object-based parameter pattern only (no more string+function overload)
inspector.chatInput({
  pattern: 'system (set|unset) settings',
  handle: (ctx) => {
    // Handler code
  }
});  // () => { } // unloader

// Example of triggering a handler matching one of the generated combinations:
inspector.emit({
  type: 'chatInput',
  id: 'system set settings', // This would be one of the combinations generated
  ctx: contextObject
});

inspector.button({
  id: "",
  handle() {

  }
})

pack.use(inspector);  // () => { } // unloader
pack.use(locales);  // () => { } // unloader

tescord.use(pack);  // () => { } // unloader
tescord.use(chatCommandExtension({
  prefix: "!"
}))
tescord.slashCommand({
  id: 'example',
  name: 'example (command)?', // []
  description: 'an example command',
  onExecute: (ctx) => {
    ctx.interaction.reply({
      content: 'Hello world',
      ephemeral: true
    })
  }
}); // () => { } // unloader

tescord.start();

// TODO: add proxy support for more rate limits, see @discordjs/proxy
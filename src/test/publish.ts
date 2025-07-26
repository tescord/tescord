import { Tessen, Pack, Locale } from '../index';
import { GatewayIntentBits, MessageFlags } from 'discord.js';

// Create Tessen instance with multiple clients
const tessen = new Tessen({
  id: 'TestBot',
  clients: [
    {
      id: 'primary-bot',
      options: {
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      },
      token: process.env.DISCORD_TOKEN || ''
    }
  ]
});

// Create pack for commands
const commandPack = new Pack({ id: 'CommandPack' });

// Create locale instance
const locales = new Locale({ id: 'TestLocales' });

// Add inline content localizations
const localeUnloaders = [
  // English content
  locales.addLocale({
    id: 'content-en',
    locale: 'en' as any,
    data: {
      commands: {
        gender: {
          response: 'You selected: {0}. Thank you for sharing!'
        }
      }
    }
  }),
  
  // Turkish content
  locales.addLocale({
    id: 'content-tr',
    locale: 'tr' as any,
    data: {
      commands: {
        gender: {
          response: 'Seçiminiz: {0}. Paylaştığınız için teşekkürler!'
        }
      }
    }
  }),
  
  // Spanish content
  locales.addLocale({
    id: 'content-es',
    locale: 'es' as any,
    data: {
      commands: {
        gender: {
          response: 'Seleccionaste: {0}. ¡Gracias por compartir!'
        }
      }
    }
  })
];

// Add interaction localizations for the gender command
const interactionLocaleUnloaders = [
  // Turkish localizations
  locales.addInteractionLocale({
    id: 'gender-command',
    locale: 'tr',
    data: {
      names: {
        'lookup': 'bakın',
        'look': 'bak',
        'gender': 'cinsiyet',
        'genders': 'cinsiyetler',
      },
      description: 'Cinsiyetinizi seçin',
      options: {
        choice: {
          name: 'seçim',
          description: 'Cinsiyetinizi belirtin',
          choices: {
            'male': 'Erkek',
            'female': 'Kadın',
            'other': 'Diğer'
          }
        }
      }
    }
  }),
  
  // Spanish localizations
  locales.addInteractionLocale({
    id: 'gender-command',
    locale: 'es' as any,
    data: {
      names: {
        'lookup': 'buscar',
        'look': 'ver',
        'gender': 'género',
        'genders': 'géneros'
      },
      description: 'Selecciona tu género',
      options: {
        choice: {
          name: 'opcion',
          description: 'Especifica tu género',
          choices: {
            'male': 'Masculino',
            'female': 'Femenino',
            'other': 'Otro'
          }
        }
      }
    }
  })
];

// Register slash command with localization - target primary bot
const genderCommandUnloader = commandPack.slashCommand({
  id: 'gender-command',
  name: '(lookup|look) (gender|genders)',
  description: 'Select your gender',
  clientId: 'primary-bot', // This command will only be published to the primary bot
  options: {
    choice: {
      description: 'Specify your gender',
      type: 'String',
      required: true,
      choices: {
        'male': 'Male',
        'female': 'Female',
        'other': 'Other'
      }
    }
  },
  handle: async (ctx) => {
    const genderChoice = ctx.interaction.options.getString('choice', true);
    
    // Get localized response
    const responseText = ctx.locale.user.commands.gender.response(genderChoice);
    
    await ctx.interaction.reply({
      content: responseText,
      ephemeral: true
    });
  }
});

// Register a different command for the secondary bot
const pingCommandUnloader = commandPack.slashCommand({
  id: 'ping-command',
  name: 'ping',
  description: 'Ping the bot',
  handle: async (ctx) => {
    const latency = ctx.interaction.client.ws.ping;
    await ctx.interaction.reply({
      content: `🏓 Pong! Latency: ${latency}ms`,
      ephemeral: true
    });
  }
});

// Register a command without clientId (will go to default/first client)
const helpCommandUnloader = commandPack.slashCommand({
  id: 'help-command',
  name: 'help',
  description: 'Get help information',
  // No clientId specified - will be published to first client (primary-bot)
  handle: async (ctx) => {
    try {
      await ctx.interaction.reply({
        content: '📋 This is a test bot with localized commands!\n\n' +
                 '• `/gender` - Select your gender (localized)\n' +
                 '• `/ping` - Check bot latency\n' +
                 '• `/help` - Show this help message',
        ephemeral: true
      });
    } catch (error) {
      console.error('❌ Failed to send help message:', error);
      await ctx.interaction.reply({
        content: '❌ An error occurred while trying to send the help message.',
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
});

// Use the pack and locales
const packUnloader = tessen.use(commandPack);
const localeUnloader = tessen.use(locales);

// Set up event handlers
const readyUnloader = commandPack.event({
  event: 'ready',
  handle: async (ctx) => {
    console.log(`✅ Client ${ctx.client.user?.tag} is ready!`);  
  }
});

const interactionCreateUnloader = commandPack.event({
  event: 'interactionCreate',
  handle: async (ctx) => {
    console.log(`📨 Interaction received on ${ctx.interaction.client.user.username}: ${ctx.interaction.type}`);
  }
});

// Set up Tessen event handlers
tessen.events.on('tessen:interactionsPublished', (data) => {
  console.log(`✅ Published ${data.count} commands to client ${data.clientId}`);
});

tessen.events.on('tessen:interactionsPublishError', (data) => {
  console.error(`❌ Failed to publish interactions for client ${data.clientId}:`, data.error);
});

tessen.events.on('tessen:publishWarning', (data) => {
  console.warn(`⚠️ ${(data as any).message}`);
});

tessen.events.on('tessen:clientReady', (data) => {
  console.log(`🤖 Client ${data.client.id} is ready!`);
});

tessen.events.on('tessen:clientsReady', (data) => {
  console.log(`🎉 All ${data.clients.size} clients are ready!`);
});

// Cleanup function
function cleanup() {
  console.log('🧹 Cleaning up...');
  
  // Unload all components
  genderCommandUnloader();
  pingCommandUnloader();
  helpCommandUnloader();
  readyUnloader();
  interactionCreateUnloader();
  packUnloader();
  localeUnloader();
  
  // Unload locales
  localeUnloaders.forEach(unloader => unloader());
  interactionLocaleUnloaders.forEach(unloader => unloader());
  
  // Destroy tessen instance
  tessen.destroy();
  
  console.log('✅ Cleanup complete!');
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the bot
async function start() {
  try {
    console.log('🚀 Starting Tessen test bot...');
    
    // Refresh clients before starting
    tessen.refreshClients();
    
    // Start all clients
    await tessen.start();
    await tessen.publish();
    
    console.log('✨ Bot started successfully!');
    console.log('📋 Available commands:');
    console.log('   • /gender - Select your gender (primary-bot only, localized)');
    console.log('   • /ping - Check bot latency');
    console.log('   • /help - Get help information (primary-bot, default)');
    console.log('');
    console.log('🌍 Supported languages: English (en), Turkish (tr), Spanish (es)');
    console.log('');
    console.log('Press Ctrl+C to stop the bot.');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    cleanup();
    process.exit(1);
  }
}

// Export for module usage
export { tessen, cleanup };

// Start if run directly
if (require.main === module) {
  start();
}

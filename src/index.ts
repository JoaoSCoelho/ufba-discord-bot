import './utils/configEnv';
import './classes/LogSystem';

import { GatewayIntentBits } from 'discord.js';
import LocalClient from './classes/LocalClient';
import CommandHandler from './CommandHandler';
import EventHandler from './event-handler';

export const client = new LocalClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMembers,
    ]
});

new CommandHandler().handleAllCommands();
new EventHandler().handleAllEvents();


// Login bot with the discord
client.login(process.env.TOKEN);

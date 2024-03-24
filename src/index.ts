import './config-env';
import './classes/LogSystem';

import { GatewayIntentBits } from 'discord.js';
import LocalClient from './classes/LocalClient';
import commandHandler, { adminCommandHandler } from './command-handler';
import eventHandler from './event-handler';


// Instance a new Client Bot
export const client = new LocalClient({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMembers,
] });

// Map all the commands in '/commands/[type]'|'/admin_commands' directories and put it in .commands|.adminCommands of the client
commandHandler(client);
adminCommandHandler(client);


// Map all events in '/events' directory and register in bot event listeners
eventHandler();


// Login bot with the discord
client.login(process.env.TOKEN);

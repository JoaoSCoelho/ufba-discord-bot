import { Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import LocalClient from './classes/LocalClient';
import commandHandler, { adminCommandHandler } from './command-handler';
import Database from './database/Database';
import Member from './classes/database/Member';
import scoreSystem from './score-system';

// Set the environment variables from '.env' file
config();

// Instance a new Client Bot
const client = new LocalClient({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMembers,
] });

// Map all the commands in '/commands/[type]'|'/admin_commands' directories and put it in .commands|.adminCommands of the bot
commandHandler(client);
adminCommandHandler(client);

// These event are executed when the bot goes online on discord
client.once(Events.ClientReady, readyClient => {
    console.log(`Bot ${readyClient.user.tag} iniciado!`);

    client.database = new Database(client);

    client.database?.on('ready', () => console.log('Database running!'));
});

// Captures when a interaction with the bot occurs
client.on(Events.InteractionCreate, async interaction => {
    // Filter only chatinput commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true });
        } else {
            await interaction.reply({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true });
        }
    }
});

// Captures when a new message is sent
client.on(Events.MessageCreate, async (message) => {
    // Filter only messages of bot admins
    if (!client.admins.includes(message.author.id)) return;
    
    // Filter only messages that can be a admin command
    if (!message.content.startsWith(client.prefix)) return;

    // Removes the prefix of the message
    const prefixRemovedMessageContent = message.content.slice(client.prefix.length);

    // Divide the message in words and take the first as the command name
    const words = prefixRemovedMessageContent.split(/ +/g);
    const calledCommand = words.shift()!;

    // Remove the command name from the message content, make a trim and replace all \" by a controlled match string
    const commandMessage = prefixRemovedMessageContent
        .slice(calledCommand.length).trim().replace(/\\"/g, '%%QUOTATION%%');

    const params = getParamsAsAObject(() => /-(\w+)="([^"]+)"/g, commandMessage);

    const command = client.adminCommands.get(calledCommand);

    if (!command) return;

    try {
        await command.execute(
            message, 
            client, 
            params, // In line below, words are passed to the function only if don't have params
            !Object.values(params).length ? words : []
        );
		
    } catch (error) {
        console.error(error);
        await message.reply({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!' });
    }
});

client.on(Events.MessageCreate, async (message) => {
    // Filter only guild messages
    if (!message.inGuild()) return;
    if (message.author.id === client.user!.id) return;

    await scoreSystem(client, message);
});



client.on(Events.GuildCreate, async (guild) => {
    if (!client.database) return;

    guild.members.cache.forEach((guildMember) => {
        const alreadyHasTheMember = !!client.database!.member.find((member) => 
            member.discordId === guildMember.id && member.discordGuildId === guild.id
        );

        if (alreadyHasTheMember) return;



        const member = new Member({
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            discordId: guildMember.id,
            discordGuildId: guild.id,
        });
        
        client.database!.member.new(member);
    });
});

client.on(Events.GuildDelete, (guild) => {
    if (!client.database) return;

    client.database!.member.filter((member) => {
        return member.discordGuildId === guild.id;
    }).forEach((member) => client.database!.member.remove(member.id));
});

client.on(Events.GuildMemberAdd, (guildMember) => {
    if (!client.database) return;

    const alreadyHasTheMember = client.database.member.find((member) => 
        member.discordGuildId === guildMember.guild.id && member.discordId === guildMember.id
    );

    if (alreadyHasTheMember) return;

    const member = new Member({
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        discordId: guildMember.id,
        discordGuildId: guildMember.guild.id,
    });

    client.database.member.new(member);
});



function getParamsAsAObject(regexGen: () => RegExp, string: string) {
    const params: Record<string, string> = {};

    // string.match(regexGen) returns a array of general cases encountered
    for (const match of string.match(regexGen()) ?? []) {
        // regexp.exec(match) will return a ExecArray that contain each match group of the regexp
        const execResult = regexGen().exec(match);
        execResult && (params[execResult[1]] = execResult[2].replaceAll('%%QUOTATION%%', '"'));
    }

    return params;
}

// Login bot with the discord
client.login(process.env.TOKEN);

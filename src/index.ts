import './configEnv';

import { Events, GatewayIntentBits } from 'discord.js';
import LocalClient from './classes/LocalClient';
import commandHandler, { adminCommandHandler } from './command-handler';
import Database from './database/Database';
import Member from './classes/database/Member';
import scoreSystem from './score-system';
import LogSystem from './classes/LogSystem';
import chalk from 'chalk';

export const log = new LogSystem();

// Instance a new Client Bot
const client = new LocalClient({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMembers,
] });

// Map all the commands in '/commands/[type]'|'/admin_commands' directories and put it in .commands|.adminCommands of the client
// Mapeia todos os comandos das pastas '/commands/[type]' e '/admin_commands' e coloca isso na propriedade '.commands' e '.adminCommands' do client
commandHandler(client);
adminCommandHandler(client);


// These event are executed when the bot goes online on discord
client.once(Events.ClientReady, readyClient => {
    log.info(`Bot ${chalk.cyan(`@${readyClient.user.tag}`)} iniciado`);

    log.clientReady(client);
    client.database = new Database(client);

    client.database!.on('ready', () => log.info('Banco de dados pronto'));
});

// Captures when a interaction with the bot occurs
client.on(Events.InteractionCreate, async (interaction) => {
    // Filter only chatinput commands in guild
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

    log.infoh(`#(@${interaction.user.tag})# usou o comando #(/${interaction.commandName})# no canal #(@${interaction.channel?.name ?? interaction.channelId})# do servidor #(${interaction.guild?.name ?? interaction.guildId})#`);

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        log.error(`Não foi encontrado o comando /#(${interaction.commandName}) na lista de comandos do bot`);
        return;
    }


    try {
        await command.execute(interaction, client);
    } catch (error) {
        log.error(`Aconteceu um erro na execução do comando /#(${interaction.commandName})# pelo usuário #(@${interaction.user.tag})#, no canal #(@${interaction.channel?.name ?? interaction.channelId})# do servidor #(${interaction.guild?.name ?? interaction.guildId})#`, error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true });
        } else {
            await interaction.reply({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true });
        }
    }
});

// Captures when a new message is sent
client.on(Events.MessageCreate, async (message) => {


    // Computes message to scoreSystem if is a message in guild and isn't a bot
    if (message.inGuild() && !message.author.bot) 
        scoreSystem(client, message)
            .catch((error) => log.error(`Ocorreu um erro ao executar ${chalk.bold.gray('scoreSystem')} para a mensagem enviada por #(@${message.author.tag})# no servidor #(${message.guild.name})#\n#(Conteúdo)#:`, message.content, '\n#(Erro)#:', error, '\n#(Arquivos)#:', message.attachments, '\n#(Message)#:', message));





    // Computes the message to an admin command

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

    log.infoh(
        `O admin #(@${message.author.tag})# usou o comando de admin #(${client.prefix}${calledCommand})#, no canal #(@${message.channel.isDMBased() ? 'DM' : message.channel.name})# do servidor #(${message.channel.isDMBased() ? 'DM' : (message.guild?.name ?? message.guildId)})#`, 
        ...(Object.values(params).length ? ['\nParâmetros:', params] : []), 
        ...(words.length ? ['\nArgumentos:', words] : [])
    );


    try {
        await command.execute(
            message, 
            client, 
            params, // In line below, words are passed to the function only if don't have params
            !Object.values(params).length ? words : []
        );
		
    } catch (error) {
        log.error(`Aconteceu um erro na execução do comando /#(${client.prefix}${calledCommand})# pelo admin #(@${message.author.tag})#, no canal #(@${message.channel.isDMBased() ? 'DM' : message.channel.name})# do servidor #(${message.channel.isDMBased() ? 'DM' : (message.guild?.name ?? message.guildId)})#`, error);
        await message.reply({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!' });
    }
});

// Captures when the client enter on a guild
client.on(Events.GuildCreate, async (guild) => {
    log.info(`O bot acabou de entrar no servidor "#(${guild.name})#" - #(${guild.id})#`);

    if (!client.database) return;

    let addedMembersCount = 0;
    let errorOnAddingMemberCount = 0;
    // `PT`: Mapeia todos os membros do servidor para o banco de dados do bot
    await Promise.all(guild.members.cache.map(async (guildMember) => {
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
        
        await client.database!.member.new(member)
            .then(() => {
                log.successh(`Membro #(@${guildMember.user.tag})# do servidor #(${guild.name})# adicionado ao banco de dados`);
                addedMembersCount++;
            })
            .catch((error) => {
                log.error(`Erro ao adicionar membro #(@${guildMember.user.tag})# do servidor #(${guild.name})# ao banco de dados\n#(Erro)#:`, error, '\n#(Membro)#:', member);
                errorOnAddingMemberCount++;
            });
    }));

    log.info(`#(${addedMembersCount})# membros do servidor #(${guild.name})# adicionados ao banco. #(${errorOnAddingMemberCount})# membros tiveram erro ao serem adicionados ao banco.`);
});

// Captures when the client get out of a guild
client.on(Events.GuildDelete, async (guild) => {
    if (!client.database) return;

    log.info(`O bot acabou de sair do servidor "#(${guild.name || guild.id})#"`);

    // Removes all members with this guild.id
    await Promise.all(client.database!.member
        .filter((member) =>  member.discordGuildId === guild.id)
        .map(async (member) => {
            await client.database!.member.remove(member.id)
                .then(() => log.success(`Member #(${member.id})# from server #(${guild.name || guild.id})#, successfully removed from database`))
                .catch((error) => log.error(`Erro ao remover membro #(${member.id})# do servidor #(${guild.name || guild.id})#\n#(Erro)#:`, error));
        }));

    log.info(`Members from server #(${guild.name || guild.id})# removed from database`);
});

client.on(Events.GuildMemberAdd, async (guildMember) => {
    if (!client.database) return;

    log.infoh(`O membro #(@${guildMember.user.tag})# foi adicionado ao servidor #(${guildMember.guild.name})#`);

    /** `true` if the member has already on database */
    const alreadyHasTheMember = !!client.database.member.find((member) => 
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

    await client.database.member.new(member)
        .then(() => log.successh(`Membro #(@${guildMember.user.tag})# do servidor #(${guildMember.guild.name})# adicionado ao banco de dados`))
        .catch((error) => log.error(`Erro ao adicionar membro #(@${guildMember.user.tag})# do servidor #(${guildMember.guild.name})# ao banco de dados`, error));
});


/** `PT`: A partir de uma RegExp com dois match groups, transforma a string em um objeto: { [key: $1]: $2 } */
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

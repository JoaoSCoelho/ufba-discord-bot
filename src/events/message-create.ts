import { Events, TextChannel } from 'discord.js';
import { client } from '..';
import ClientEvent from '../classes/ClientEvent';
import { log } from '../classes/LogSystem';
import scoreSystem from '../score-system';


// Captures when a new message is sent
export default new ClientEvent(Events.MessageCreate, async (message) => {


    // Computes message to scoreSystem if is a message in guild and isn't a bot
    if (message.inGuild() && !message.author.bot)
        scoreSystem(client, message)
            .catch((error) => {
                log.error('Ocorreu um erro ao executar #g(scoreSystem)#',
                    `para a mensagem enviada por #(@${message.author.tag})#`, 
                    `no servidor #(${message.guild.name})#`, 
                    '\n#(Conteúdo)#:', message.content,
                    '\n#(Erro)#:', error, 
                    '\n#(Arquivos)#:', message.attachments,
                    '\n#(Message)#:', message);
            });





    // Computes the message to an admin command

    // Filter only messages of the bot admins
    if (!client.admins.includes(message.author.id)) return;

    // Filter only messages that starts with the bot prefix
    if (!message.content.startsWith(client.prefix)) return;




    /** Removes the prefix of the message. 
     * @example 
     * message.content === '_myadmincommand arg1 arg2'
     * prefixRemovedMessageContent === 'myadmincommand arg1 arg2'
     */
    const prefixRemovedMessageContent = message.content.slice(client.prefix.length);

    /** Divide the message in words. */
    const words = prefixRemovedMessageContent.split(/ +/g);
    /** Take the first word as the command name. */
    const commandName = words.shift()!;

    // Remove the command name from the message content, make a trim and replace all \" by a controlled match string
    const commandMessage = prefixRemovedMessageContent
        .slice(commandName.length)
        .trim()
        .replace(/\\"/g, '%%QUOTATION%%');

    /** Command parameters as a object (if the user use parameters) @see /docs/admin-commands-helper.md#arguments-and-parameters-explanation */
    const params = getParamsAsAObject(() => /-(\w+)="([^"]+)"/g, commandMessage);






    const command = client.adminCommands.get(commandName);

    if (!command) return;

    log.infoh(
        `O admin #(@${message.author.tag})# usou o comando de admin #(${client.prefix}${commandName})#,`,
        `no canal #(@${message.channel.isDMBased() ? 'DM' : message.channel.name})#`,
        `do servidor #(${message.channel.isDMBased() ? 'DM' : (message.guild?.name ?? message.guildId)})#`,
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

        log.infoh(`Fim da execução do comando de admin #(${client.prefix}${commandName})#`,
            `executado por #(@${message.author.tag})#`, 
            `no canal #(#${(message.channel as TextChannel | undefined)?.name ?? message.channelId})#`,
            `do servidor #(${message.guild?.name ?? message.guildId})#`);
    } catch (error) {
        log.error(`Aconteceu um erro na execução do comando #(${client.prefix}${commandName})#`,
            `pelo admin #(@${message.author.tag})#,`,
            `no canal #(@${message.channel.isDMBased() ? 'DM' : message.channel.name})#`,
            `do servidor #(${message.channel.isDMBased() ? 'DM' : (message.guild?.name ?? message.guildId)})#`,
            error);
            
        await message.reply({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!' })
            .catch((error) => {
                log.error(`Erro ao enviar mensagem de erro na execução do comando de admin #(${client.prefix}${commandName})#`, error);
            });
    }
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
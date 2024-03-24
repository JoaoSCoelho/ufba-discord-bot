import { CommandInteraction, Events } from 'discord.js';
import ClientEvent from '../classes/ClientEvent';
import { log } from '../classes/LogSystem';
import { client } from '..';
import CommandExecution from '../classes/CommandExecution';
import LocalClient from '../classes/LocalClient';


// Captures when a interaction with the bot occurs
export default new ClientEvent(
    Events.InteractionCreate, async (interaction) => {
        // Filter only chatinput commands in guild
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;
    
        log.infoh(`#(@${interaction.user.tag})# usou o comando #(/${interaction.commandName})#`,
            `no canal #(#${interaction.channel?.name ?? interaction.channelId})#`,
            `do servidor #(${interaction.guild?.name ?? interaction.guildId})#`);
    
        const command = client.commands.get(interaction.commandName);
    
        if (!command) {
            log.error(`Não foi encontrado o comando /#(${interaction.commandName})# na lista de comandos do bot`);
            return;
        }
    
    
        try {
            // [TASK 1.0] // Remove it when all commands have "execution" class
            if (command.execute.toString().startsWith('class')) {
                await new (command.execute as typeof CommandExecution)(interaction, client).run();
            } else {
                await (command.execute as (interaction: CommandInteraction, client: LocalClient) => Promise<unknown>)(interaction, client);
            }
    
            log.infoh(`Fim da execução do comando #(/${interaction.commandName})#`,
                `executado por #(@${interaction.user.tag})#`, 
                `no canal #(#${interaction.channel?.name ?? interaction.channelId})#`,
                `do servidor #(${interaction.guild?.name ?? interaction.guildId})#`);
        } catch (error) {
            log.error(`Aconteceu um erro na execução do comando /#(${interaction.commandName})#`,
                `pelo usuário #(@${interaction.user.tag})#,`,
                `no canal #(@${interaction.channel?.name ?? interaction.channelId})#`, 
                `do servidor #(${interaction.guild?.name ?? interaction.guildId})#`, error);
    
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true })
                    .catch((error) => {
                        log.error(`Erro ao enviar mensagem de erro na execução do comando #(${interaction.commandName})#`, error);
                    });
            } else {
                await interaction.reply({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true })
                    .catch((error) => {
                        log.error(`Erro ao enviar mensagem de erro na execução do comando #(${interaction.commandName})#`, error);
                    });
            }
        }
    }
);
// File Version: 0.0.1

import { CommandInteraction, Events } from 'discord.js';
import ClientEvent from '../classes/ClientEvent';
import { log } from '../classes/LogSystem';
import { client } from '..';
import LocalClient from '../classes/LocalClient';
import BaseError from '../Errors/BaseError';
import SlashCommand from '../classes/SlashCommand';


// Captures when a interaction with the bot occurs
export default new ClientEvent(
    Events.InteractionCreate, async (interaction) => {
        // Filter only chatinput commands in guild
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

        log.infoh(`#(@${interaction.user.tag})# usou o comando #(/${interaction.commandName})#`,
            `no canal #(#${interaction.channel?.name ?? interaction.channelId})#`,
            `do servidor #(${interaction.guild?.name ?? interaction.guildId})#.`);

        const Command = client.commands.get(interaction.commandName);

        if (!Command) {
            log.error(`Não foi encontrado o comando /#(${interaction.commandName})# na lista de comandos do bot.`);
            return;
        }

        const commandInstance = new (Command as unknown as new (interaction: CommandInteraction, client: LocalClient) => SlashCommand)(
            interaction,
            client
        );


        try {
            await commandInstance.execute();

            log.infoh(`Fim da execução do comando #(/${interaction.commandName})#`,
                `executado por #(@${interaction.user.tag})#`,
                `no canal #(#${interaction.channel?.name ?? interaction.channelId})#`,
                `do servidor #(${interaction.guild?.name ?? interaction.guildId})#.`);
        } catch (error: unknown) {
            if (!BaseError.isHandled(error)) {
                log.error(`Aconteceu um erro na execução do comando /#(${interaction.commandName})#`,
                    `pelo usuário #(@${interaction.user.tag})#,`,
                    `no canal #(@${interaction.channel?.name ?? interaction.channelId})#`,
                    `do servidor #(${interaction.guild?.name ?? interaction.guildId})#.`,
                    '\n#(Erro)#:', error
                );

                BaseError.handle(error);
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true })
                    .catch((error: unknown) => {
                        log.error(`Erro ao enviar mensagem de erro na execução do comando #(${interaction.commandName})#.`,
                            '\n#(Erro)#:', error
                        );
                    });
            } else {
                await interaction.reply({ content: '‼️ Ocorreu um erro enquanto este comando estava sendo executado!', ephemeral: true })
                    .catch((error: unknown) => {
                        log.error(`Erro ao enviar mensagem de erro na execução do comando #(${interaction.commandName})#.`,
                            '\n#(Erro)#:', error
                        );
                    });
            }
        }
    }
);
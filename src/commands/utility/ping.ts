import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import prettyTime from 'pretty-time';

export default new Command(
    new SlashCommandBuilder().setName('ping').setDescription('Responde com Pong!'),
    async (interaction, client) => {
        await interaction.reply(`Pong!${client.uptime ? ` Bot ativo a **${prettyTime(client.uptime * 1_000_000, 'm')}**.` : ''} Latência WebSocket **${prettyTime(client.ws.ping * 1_000_000, 'ms')}**.`);
    } 
);
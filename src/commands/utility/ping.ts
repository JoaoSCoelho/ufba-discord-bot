import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command(
    new SlashCommandBuilder().setName('ping').setDescription('Responde com Pong!'),
    async (interaction: CommandInteraction) => {
        await interaction.reply('Pong!');
    } 
);
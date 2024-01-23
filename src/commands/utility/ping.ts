import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command(
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
    async (interaction: CommandInteraction) => {
        await interaction.reply('Pong!');
    } 
);
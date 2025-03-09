import { SlashCommandBuilder } from 'discord.js';
import SlashCommand from '../../classes/SlashCommand';

export default class TestSlashCommand extends SlashCommand {
    public static readonly data = new SlashCommandBuilder().setName('test').setDescription('Test command');

    public async execute() {
        await this.interaction.reply('Test command');
    }
}
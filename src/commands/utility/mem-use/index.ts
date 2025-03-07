import { SlashCommandBuilder } from 'discord.js';
import SlashCommand from '../../../classes/SlashCommand';
import prettyBytes from '../../../utils/prettyBytes';
import os from 'node:os';

export default new SlashCommand(
    new SlashCommandBuilder()
        .setName('mem-use')
        .setDescription('Mostra quanto de memória está sendo usado pelo bot'),

    async (interaction) => {
        interaction.reply(`rss: ${prettyBytes(process.memoryUsage().rss)}, heapUsed: ${prettyBytes(process.memoryUsage().heapUsed)}, heapTotal: ${prettyBytes(process.memoryUsage().heapTotal)}, osMem: ${prettyBytes(os.totalmem())}`);
    }
);
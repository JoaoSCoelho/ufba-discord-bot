import { SlashCommandBuilder } from 'discord.js';
import SlashCommand from '../../classes/SlashCommand';
import prettyTime from 'pretty-time';

export default class PingSlashCommand extends SlashCommand {
    public static readonly data = new SlashCommandBuilder().setName('ping').setDescription('Informa o tempo ativo do bot e a latência do WebSocket!');
    public static readonly documentation = {
        howToUse: 'Digite /ping no chat e selecione o comando na lista',
    };

    public async execute() {
        await this.interaction.reply(`Pong!${this.client.uptime ? ` Bot ativo a **${prettyTime(this.client.uptime * 1_000_000, 'm')}**.` : ''} Latência WebSocket **${prettyTime(this.client.ws.ping * 1_000_000, 'ms')}**.`);
    }
}
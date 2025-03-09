import AdminCommand from '../classes/AdminCommand';
import CommandHandler from '../utils/CommandHandler';

export default class DeployAdminCommand extends AdminCommand {
    public static readonly data = { name: 'deploy' };
    public async execute() {
        // Starts this var with commandsJson by name only
        const commandsJson = this.client.commands.map((command) => command.data.toJSON());

        const reply = await this.message.reply('Iniciando deploy...');

        await new CommandHandler().deployCommands(commandsJson);

        await reply.edit('Deploy finalizado!');
    }
}
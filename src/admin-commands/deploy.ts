import AdminCommand from '../classes/AdminCommand';
import CommandHandler from '../CommandHandler';

export default new AdminCommand(
    { name: 'deploy' },
    async (message, client) => {
        // Starts this var with commandsJson by name only
        const commandsJson = client.commands.map((command) => command.data.toJSON());

        const reply = await message.reply('Iniciando deploy...');

        await new CommandHandler().deployCommands(commandsJson);

        await reply.edit('Deploy finalizado!');
    }
);
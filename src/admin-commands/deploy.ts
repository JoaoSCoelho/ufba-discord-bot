import AdminCommand from '../classes/AdminCommand';
import { deployCommands } from '../command-handler';

export default new AdminCommand({
    name: 'deploy'
}, 
async (_message, client) => {
    deployCommands(client.commands.map((command) => command.data.toJSON()));
});
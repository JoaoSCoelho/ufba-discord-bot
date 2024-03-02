import AdminCommand from '../classes/AdminCommand';
import { deployCommands } from '../command-handler';

export default new AdminCommand({
    name: 'deploy'
}, 
async (_message, client) => {
    // Starts this var with commandsJson by name only
    const commandsJson = client.commands.map((command) => command.data.toJSON());

    // Push to `commandsJson` others commandsJson by aliases
    client.commands.forEach((command) => {
        command.documentation?.aliases?.map((alias) => {
            commandsJson.push(({ ...command.data.toJSON(), name: alias }));
        });
    });

    deployCommands(commandsJson);
});
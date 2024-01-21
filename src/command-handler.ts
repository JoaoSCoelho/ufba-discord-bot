import * as path from 'path';
import * as fs from 'fs';
import Command from './classes/Command';
import LocalClient from './classes/LocalClient';
import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';

const shouldDeploy = process.env.DEPLOY === 'true' ? true : false;
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

export default async function commandHandler(client: LocalClient) {
	const foldersPath = path.join(__dirname, 'commands');
	const commandsFolder = fs.readdirSync(foldersPath);

	for (const folder of commandsFolder) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command: Command = (await import(filePath))?.default;
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
				if (shouldDeploy) commands.push(command.data.toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
	shouldDeploy && deployCommands();
}

async function deployCommands() {
	const rest = new REST().setToken(process.env.TOKEN!);

	// and deploy your commands!

	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
			{ body: commands },
		) as Command[];

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}

}
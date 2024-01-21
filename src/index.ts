import { Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import LocalClient from './classes/LocalClient';
import commandHandler from './command-handler';

// Set the environment variables from '.env' file
config();

// Instance a new Client Bot
const client = new LocalClient({ intents: [GatewayIntentBits.Guilds] });

// Map all the commands in '/commands/[type]' directories and put it in .commands of the bot
commandHandler(client);

// These event are executed when the bot 
client.once(Events.ClientReady, readyClient => {
	console.log(`Bot ${readyClient.user.tag} iniciado!`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.login(process.env.TOKEN);
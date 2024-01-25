import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command(
    new SlashCommandBuilder()
        .setName('delete-bathroom')
        .setDescription('Deletes a specific bathroom.')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setRequired(true)
        ) as SlashCommandBuilder,

        
    async (interaction, client) => {
        const bathroomId = interaction.options.get('id')!.value as string;

        const bathroom = client.database!.bathroom.get(bathroomId);

        // Making verifications

        if (!bathroom) return interaction.reply('There is no bathroom with this ID');
        if (bathroom.createdBy !== interaction.user.id && !client.admins.includes(interaction.user.id))
            return interaction.reply('You don\'t have authorization to do this!');

        // Removing

        await client.database!.bathroom.remove(bathroomId);

        await interaction.reply('Bathroom removed');
    }
);
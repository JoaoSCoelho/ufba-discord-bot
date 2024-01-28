import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command(
    new SlashCommandBuilder()
        .setName('delete-bathroom')
        .setDescription('Deletes a specific bathroom.')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setDescription('Número de identificação do banheiro.')
                .setRequired(true)
        ) as SlashCommandBuilder,


    async (interaction, client) => {
        const bathroomId = interaction.options.get('id')!.value as string;

        const bathroom = client.database!.bathroom.get(bathroomId);

        // Making verifications

        if (!bathroom) return interaction.reply('There is no bathroom with this ID');
        if (bathroom.createdBy !== interaction.user.id && !client.admins.includes(interaction.user.id))
            return interaction.reply('You don\'t have authorization to do this!');




        const bathroomAvaliations = client.database!.bathroomAvaliation
            .filter((bathroomAvaliation) => bathroomAvaliation.bathroomId === bathroom.id);

        // Removing avaliations
        await Promise.all(bathroomAvaliations.map(async (bathroomAvaliation) => {
            await client.database!.bathroomAvaliation.remove(bathroomAvaliation.id);
        }))
            .catch((err) => {
                console.error(`The user ${interaction.user.tag} tried to use /delete-bathroom command and a error ocurred when the avaliation were being deleted:`, err);
            });


        // Removing the bathroom
        await client.database!.bathroom.remove(bathroomId);

        await interaction.reply('Bathroom removed');
    }
);
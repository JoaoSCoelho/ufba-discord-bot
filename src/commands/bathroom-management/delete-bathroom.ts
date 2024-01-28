import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command(
    new SlashCommandBuilder()
        .setName('deletar-banheiro')
        .setDescription('Deleta um banheiro que você criou pelo ID.')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setDescription('Número de identificação do banheiro.')
                .setRequired(true)
        ) as SlashCommandBuilder,


    async (interaction, client) => {
        const bathroomId = interaction.options.get('id')!.value as string;

        const bathroom = client.database!.bathroom.get(bathroomId);

        // Making verifications

        if (!bathroom) return interaction.reply('Não existe banheiro com este ID!');
        if (bathroom.createdBy !== interaction.user.id && !client.admins.includes(interaction.user.id))
            return interaction.reply('Você não tem autorização para deletar este banheiro!');




        const bathroomAvaliations = client.database!.bathroomAvaliation
            .filter((bathroomAvaliation) => bathroomAvaliation.bathroomId === bathroom.id);

        // Removing avaliations
        await Promise.all(bathroomAvaliations.map(async (bathroomAvaliation) => {
            await client.database!.bathroomAvaliation.remove(bathroomAvaliation.id);
        }))
            .catch((err) => {
                console.error(`The user ${interaction.user.tag} tried to use /deletar-banheiro command and a error ocurred when the avaliation were being deleted:`, err);
            });


        // Removing the bathroom
        await client.database!.bathroom.remove(bathroomId);

        await interaction.reply('Banheiro deletado.');
    }
);
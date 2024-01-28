import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import BathroomAvaliation from '../../classes/database/BathroomAvaliation';

export default new Command(
    new SlashCommandBuilder()
        .setName('avaliate-bathroom')
        .setDescription('Avaliates a specific bathroom by their ID')
        .addStringOption(
            Command.commandOptions.bathroomAvaliationManagement.bathroomId()
                .setRequired(true)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomAvaliationManagement.grade()
                .setRequired(true)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomAvaliationManagement.cleaningGrade()
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.hasPaperTowel()
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.hasSoap()
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.smellsGood()
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomAvaliationManagement.observations()
                .setRequired(false)
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomAvaliationManagement.image()
                .setRequired(false)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.hasToiletPaper()
                .setRequired(false)
        ) as SlashCommandBuilder,




    async (interaction, client) => {
        const options = getOptions();

        if (client.database!.bathroomAvaliation.find(
            (bathroomAvaliation) => bathroomAvaliation.bathroomId === options.bathroomId && bathroomAvaliation.createdBy === interaction.user.id
        )) return interaction.reply('Have you already reviewed this bathroom!');

        if (!client.database!.bathroom.has(options.bathroomId)) return interaction.reply('Does not exists a bathroom with this ID');

        const bathroomAvaliation = new BathroomAvaliation({
            id: Date.now().toString(),
            createdBy: interaction.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            bathroomId: options.bathroomId,
            grade: options.grade,
            cleaningGrade: options.cleaningGrade,
            hasPaperTowel: options.hasPaperTowel,
            hasToiletPaper: options.hasToiletPaper,
            hasSoap: options.hasSoap,
            smellsGood: options.smellsGood,
            observations: options.observations,
            imageUrl: options.imageUrl
        });

        await client.database!.bathroomAvaliation.new(bathroomAvaliation);
        
        await interaction.reply('Bathroom avaliated!');


        function getOptions() {
            return {
                bathroomId: interaction.options.get('bathroom-id')!.value as string,
                grade: interaction.options.get('grade')!.value as number,
                cleaningGrade: interaction.options.get('cleaning-grade')!.value as number,
                hasPaperTowel: interaction.options.get('has-paper-towel')!.value as boolean,
                hasToiletPaper: interaction.options.get('has-toilet-paper')?.value as boolean | undefined,
                hasSoap: interaction.options.get('has-soap')!.value as boolean,
                smellsGood: interaction.options.get('smells-good')!.value as boolean,
                observations: interaction.options.get('observations')?.value as string | undefined,
                imageUrl: interaction.options.get('image')?.attachment.url as string | undefined,
            };
        }
    }
);
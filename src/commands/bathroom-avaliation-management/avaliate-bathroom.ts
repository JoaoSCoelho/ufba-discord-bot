import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import BathroomAvaliation from '../../classes/database/BathroomAvaliation';

export default new Command(
    new SlashCommandBuilder()
        .setName('avaliar-banheiro')
        .setDescription('Avalia um banheiro específico pelo seu ID')
        .addStringOption(
            Command.commandOptions.bathroomAvaliationManagement.bathroomId()
                .setDescription('O número de identificação do banheiro.')
                .setRequired(true)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomAvaliationManagement.grade()
                .setDescription('Que nota você da para este banheiro? (0 a 10)')
                .setRequired(true)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomAvaliationManagement.cleaningGrade()
                .setDescription('Que nota você da para a limpeza deste banheiro? (0 a 10)')
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.hasPaperTowel()
                .setDescription('Este banheiro costuma ter papel toalha?')
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.hasSoap()
                .setDescription('Este banheiro costuma ter sabonete?')
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.smellsGood()
                .setDescription('Este banheiro tem um cheiro agradável?')
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomAvaliationManagement.observations()
                .setDescription('Comente sobre sua experiência com este banheiro.')
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomAvaliationManagement.image()
                .setDescription('Se quiser, pode adicionar uma imagem que descreva sua avaliação.')
        )
        .addBooleanOption(
            Command.commandOptions.bathroomAvaliationManagement.hasToiletPaper()
                .setDescription('Este banheiro costuma ter papel higiênico?')
        ) as SlashCommandBuilder,




    async (interaction, client) => {
        const options = getOptions();

        if (client.database!.bathroomAvaliation.find(
            (bathroomAvaliation) => bathroomAvaliation.bathroomId === options.bathroomId && bathroomAvaliation.createdBy === interaction.user.id
        )) return interaction.reply('Você já avaliou este banheiro!');

        if (!client.database!.bathroom.has(options.bathroomId)) return interaction.reply('Não existe um banheiro com este ID!');

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
        
        await interaction.reply('Banheiro avaliado!');


        function getOptions() {
            return {
                bathroomId: interaction.options.get('id-do-banheiro')!.value as string,
                grade: interaction.options.get('nota')!.value as number,
                cleaningGrade: interaction.options.get('nota-da-limpeza')!.value as number,
                hasPaperTowel: interaction.options.get('tem-papel-toalha')!.value as boolean,
                hasToiletPaper: interaction.options.get('tem-papel-higienico')?.value as boolean | undefined,
                hasSoap: interaction.options.get('tem-sabonete')!.value as boolean,
                smellsGood: interaction.options.get('cheira-bem')!.value as boolean,
                observations: interaction.options.get('comentarios')?.value as string | undefined,
                imageUrl: interaction.options.get('imagem')?.attachment.url as string | undefined,
            };
        }
    }
);
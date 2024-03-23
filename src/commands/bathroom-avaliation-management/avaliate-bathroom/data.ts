import { SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from 'discord.js';
import BathroomAvaliation from '../../../classes/database/BathroomAvaliation';

export default new SlashCommandBuilder()
    .setName('avaliar-banheiro')
    .setDescription('Avalia um banheiro específico pelo seu ID')
    .addStringOption(
        new SlashCommandStringOption()
            .setName(BathroomAvaliation.bathroomId.name)
            .setDescription('O número de identificação do banheiro.')
            .setRequired(true)
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(BathroomAvaliation.grade.name)
            .setMinValue(BathroomAvaliation.grade.min)
            .setMaxValue(BathroomAvaliation.grade.max)
            .setDescription('Que nota você da para este banheiro? (0 a 10)')
            .setRequired(true)
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(BathroomAvaliation.cleaningGrade.name)
            .setMinValue(BathroomAvaliation.cleaningGrade.min)
            .setMaxValue(BathroomAvaliation.cleaningGrade.max)
            .setDescription('Que nota você da para a limpeza deste banheiro? (0 a 10)')
            .setRequired(true)
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(BathroomAvaliation.hasPaperTowel.name)
            .setDescription('Este banheiro costuma ter papel toalha?')
            .setRequired(true)
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(BathroomAvaliation.hasSoap.name)
            .setDescription('Este banheiro costuma ter sabonete?')
            .setRequired(true)
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(BathroomAvaliation.smellsGood.name)
            .setDescription('Este banheiro tem um cheiro agradável?')
            .setRequired(true)
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(BathroomAvaliation.hasToiletPaper.name)
            .setDescription('Este banheiro costuma ter papel higiênico?')
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(BathroomAvaliation.observations.name)
            .setMinLength(BathroomAvaliation.observations.minLength)
            .setMaxLength(BathroomAvaliation.observations.maxLength)
            .setDescription('Comente sobre sua experiência com este banheiro.')
    )
    .addAttachmentOption(
        new SlashCommandAttachmentOption()
            .setName('imagem')
            .setDescription('Se quiser, pode adicionar uma imagem que descreva sua avaliação.')
    ) as SlashCommandBuilder;
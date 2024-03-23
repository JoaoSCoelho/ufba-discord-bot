import { SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from 'discord.js';
import Bathroom from '../../../classes/database/Bathroom';

export default new SlashCommandBuilder()
    .setName('editar-banheiro')
    .setDescription('Edita um banheiro que você criou pelo ID.')
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.id.name)
            .setDescription('Número de identificação do banheiro.')
            .setRequired(true)
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.campus.name)
            .setChoices(...Bathroom.campus.commandOptionsChoices)
            .setDescription('Escolha em qual campus está localizado este banheiro!')
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.institute.name)
            .setMinLength(Bathroom.institute.minLength)
            .setMaxLength(Bathroom.institute.maxLength)
            .setDescription('Em qual instituto da UFBA está localizado o banheiro?')
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(Bathroom.floor.name)
            .setMinValue(Bathroom.floor.min)
            .setMaxValue(Bathroom.floor.max)
            .setDescription('Em que andar/piso do prédio está o banheiro? (0 para térreo) (valores negativos para subsolo)')
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(Bathroom.haveShower.name)
            .setDescription('Tem espaço para banhos neste banheiro?')
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(Bathroom.hasHandDryer.name)
            .setDescription('Tem secador de mãos neste banheiro?')
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.gender.name)
            .setChoices(...Bathroom.gender.commandOptionsChoices)
            .setDescription('Este é um banheiro Masculino, Feminino ou Unissex')
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(Bathroom.cabins.name)
            .setMinValue(Bathroom.cabins.min)
            .setMaxValue(Bathroom.cabins.max)
            .setDescription('Quantas cabines tem neste banheiro?')
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(Bathroom.urinals.name)
            .setMinValue(Bathroom.urinals.min)
            .setMaxValue(Bathroom.urinals.max)
            .setDescription('Quantos mictórios tem neste banheiro? (se aplicável)')
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.localization.name)
            .setMinLength(Bathroom.localization.minLength)
            .setMaxLength(Bathroom.localization.maxLength)
            .setDescription('Dê uma descrição de como chegar a este banheiro.')
    ) 
    .addStringOption(
        new SlashCommandStringOption()
            .setName('url-da-imagem-principal')
            .setDescription('O URL da imagem principal do banheiro.')
    ) as SlashCommandBuilder;
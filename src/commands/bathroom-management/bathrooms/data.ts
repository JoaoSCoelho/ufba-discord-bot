import { SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandUserOption } from 'discord.js';
import Bathroom from '../../../classes/database/Bathroom';

export default new SlashCommandBuilder()
    .setName('banheiros')
    .setDescription('Lista todos os banheiros já registrados.')
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.id.name)
            .setDescription('Encontre um banheiro específico pelo seu número de identificação')
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.campus.name)
            .setChoices(...Bathroom.campus.commandOptionsChoices)
            .setDescription('Filtre apenas banheiros de um campus específico.')
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.institute.name)
            .setMaxLength(Bathroom.institute.maxLength)
            .setMinLength(Bathroom.institute.minLength)
            .setDescription('Filtre apenas banheiros de um instituto específico.')
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(Bathroom.floor.name)
            .setMinValue(Bathroom.floor.min)
            .setMaxValue(Bathroom.floor.max)
            .setDescription('Encontre apenas banheiros que estejam em um andar específico.')
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(Bathroom.haveShower.name)
            .setDescription('Encontre apenas banheiros que tenham chuveiro.')
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName(Bathroom.hasHandDryer.name)
            .setDescription('Encontre apenas banheiros que tenham secador para mãos.')
    )
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.gender.name)
            .setChoices(...Bathroom.gender.commandOptionsChoices)
            .setDescription('Encontre apenas banheiros de um gênero específico.')
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(Bathroom.cabins.name)
            .setMinValue(Bathroom.cabins.min)
            .setMaxValue(Bathroom.cabins.max)
            .setDescription('Encontre banheiros que possuam uma quantidade específica de cabines.')
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
            .setName(Bathroom.urinals.name)
            .setMinValue(Bathroom.urinals.min)
            .setMaxValue(Bathroom.urinals.max)
            .setDescription('Encontre banheiros que possuam uma quantidade específica de mictórios.')
    )
    .addUserOption(
        new SlashCommandUserOption()
            .setName('criador')
            .setDescription('Encontra banheiros criados por um usuário específico.')
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName('tem-imagem')
            .setDescription('Filtra apenas banheiros que tenham imagens.')
    ) as SlashCommandBuilder;
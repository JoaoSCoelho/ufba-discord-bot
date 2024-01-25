import { SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandIntegerOption, SlashCommandStringOption } from 'discord.js';
import { CampusNames, GenderNames } from '../classes/database/Bathroom';

export default {
    bathroomManagement: {
        campus: () => new SlashCommandStringOption()
            .setName('campus')
            .setChoices(
                {
                    name: CampusNames.CANELA,
                    value: 'CANELA'
                },
                {
                    name: CampusNames.ONDINA,
                    value: 'ONDINA',
                },
                {
                    name: CampusNames.SAO_LAZARO,
                    value: 'SAO_LAZARO'
                },
                {
                    name: CampusNames.FEDERACAO,
                    value: 'FEDERACAO'
                },
                {
                    name: CampusNames.VITORIA,
                    value: 'VITORIA'
                },
                {
                    name: CampusNames.CAMACARI,
                    value: 'CAMACARI'
                },
            )
            .setDescription('Escolha em qual campus está localizado este banheiro!'),
        institute: () => new SlashCommandStringOption()
            .setName('institute')
            .setDescription('Em qual instituto da UFBA está localizado o banheiro?')
            .setMinLength(3),
        floor: () => new SlashCommandIntegerOption()
            .setName('floor')
            .setDescription('Em que andar/piso do prédio está o banheiro? (0 para térreo) (valores negativos para subsolo)'),
        haveShower: () => new SlashCommandBooleanOption()
            .setName('have-shower')
            .setDescription('Tem espaço para banhos neste banheiro?'),
        hasHandDryer: () => new SlashCommandBooleanOption()
            .setName('has-hand-dryer')
            .setDescription('Tem secador de mãos neste banheiro?'),
        gender: () => new SlashCommandStringOption()
            .setName('gender')
            .setDescription('masculino, feminino ou unissex')
            .setChoices(
                {
                    name: GenderNames.MASCULINO,
                    value: 'MASCULINO'
                },
                {
                    name: GenderNames.FEMININO,
                    value: 'FEMININO',
                },
                {
                    name: GenderNames.UNISSEX,
                    value: 'UNISSEX'
                },
            ),
        cabins: () => new SlashCommandIntegerOption()
            .setName('cabins')
            .setDescription('Quantidade de cabines no banheiro')
            .setMinValue(0),
        urinals: () => new SlashCommandIntegerOption()
            .setName('urinals')
            .setDescription('Quantidade de mictórios no banheiro. (se aplicável)')
            .setMinValue(0),
        localization: () => new SlashCommandStringOption()
            .setName('localization')
            .setDescription('Dê uma descrição de como chegar a este banheiro')
            .setMinLength(10),
        image: () => new SlashCommandAttachmentOption()
            .setName('image')
            .setDescription('Se tiver, forneça-nos imagens do banheiro'),
        id: () => new SlashCommandStringOption()
            .setName('id')
            .setDescription('ID of the bathroom'),
    }
};
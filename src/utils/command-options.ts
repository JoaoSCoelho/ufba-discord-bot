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
            ),
        institute: () => new SlashCommandStringOption()
            .setName('instituto')
            .setMinLength(3)
            .setMaxLength(50),
        floor: () => new SlashCommandIntegerOption()
            .setName('andar')
            .setMaxValue(163)
            .setMinValue(-2400),
        haveShower: () => new SlashCommandBooleanOption()
            .setName('tem-chuveiro'),
        hasHandDryer: () => new SlashCommandBooleanOption()
            .setName('tem-secador-de-maos'),
        gender: () => new SlashCommandStringOption()
            .setName('genero')
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
            .setName('cabines')
            .setMinValue(0)
            .setMaxValue(1000),
        urinals: () => new SlashCommandIntegerOption()
            .setName('mictorios')
            .setMinValue(0)
            .setMaxValue(1000),
        localization: () => new SlashCommandStringOption()
            .setName('localizacao')
            .setMinLength(10)
            .setMaxLength(512),
        image: () => new SlashCommandAttachmentOption()
            .setName('imagem'),
        id: () => new SlashCommandStringOption()
            .setName('id'),
    },
    bathroomAvaliationManagement: {
        bathroomId: () => new SlashCommandStringOption()
            .setName('id-do-banheiro'),
        grade: () => new SlashCommandIntegerOption()
            .setName('nota')
            .setMinValue(0)
            .setMaxValue(10),
        cleaningGrade: () => new SlashCommandIntegerOption()
            .setName('nota-da-limpeza')
            .setMinValue(0)
            .setMaxValue(10),
        hasPaperTowel: () => new SlashCommandBooleanOption()
            .setName('tem-papel-toalha'),
        hasToiletPaper: () => new SlashCommandBooleanOption()
            .setName('tem-papel-higienico'),
        hasSoap: () => new SlashCommandBooleanOption()
            .setName('tem-sabonete'),
        smellsGood: () => new SlashCommandBooleanOption()
            .setName('cheira-bem'),
        observations: () => new SlashCommandStringOption()
            .setName('comentarios')
            .setMinLength(10)
            .setMaxLength(500),
        image: () => new SlashCommandAttachmentOption()
            .setName('imagem')
        
    }
};
import { CommandInteraction, SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from 'discord.js';
import LocalClient from './LocalClient';

export default class Command {
    constructor(
		public data: SlashCommandBuilder,
	    public execute: (interaction: CommandInteraction, client: LocalClient) => unknown
    ) {}

    static commandOptions = {
        bathroomManagement: {
            campus: new SlashCommandStringOption()
                .setName('campus')
                .setChoices(
                    {
                        name: 'Canela',
                        value: 'CANELA'
                    },
                    {
                        name: 'Ondina',
                        value: 'ONDINA',
                    },
                    {
                        name: 'São Lázaro',
                        value: 'SAO_LAZARO'
                    },
                    {
                        name: 'Federação',
                        value: 'FEDERACAO'
                    },
                    {
                        name: 'Vitória da Conquista',
                        value: 'VITORIA'
                    },
                    {
                        name: 'Camaçari',
                        value: 'CAMACARI'
                    },
                )
                .setDescription('Escolha em qual campus está localizado este banheiro!'),
            institute: new SlashCommandStringOption()
                .setName('institute')
                .setDescription('Em qual instituto da UFBA está localizado o banheiro?')
                .setAutocomplete(true)
                .setMinLength(3),
            floor: new SlashCommandIntegerOption()
                .setName('floor')
                .setDescription('Em que andar/piso do prédio está o banheiro? (0 para térreo) (valores negativos para subsolo)'),
            haveShower: new SlashCommandBooleanOption()
                .setName('have-shower')
                .setDescription('Tem espaço para banhos neste banheiro?'),
            localization: new SlashCommandStringOption()
                .setName('localization')
                .setDescription('Dê uma descrição de como chegar a este banheiro')
                .setMinLength(10),
            images: new SlashCommandAttachmentOption()
                .setName('images')
                .setDescription('Se tiver, forneça-nos imagens do banheiro')
        }
    };
}
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusValues, GenderValues } from '../../classes/database/Bathroom';

export default new Command(
    new SlashCommandBuilder()
        .setName('cadastrar-banheiro')
        .setDescription('Registra um novo banheiro.')
        .addStringOption(
            Command.commandOptions.bathroomManagement.campus()
                .setDescription('Escolha em qual campus está localizado este banheiro!')
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.institute()
                .setDescription('Em qual instituto da UFBA está localizado o banheiro?')
                .setRequired(true)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.floor()
                .setDescription('Em que andar/piso do prédio está o banheiro? (0 para térreo) (valores negativos para subsolo)')
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.haveShower()
                .setDescription('Tem espaço para banhos neste banheiro?')
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.hasHandDryer()
                .setDescription('Tem secador de mãos neste banheiro?')
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.gender()
                .setDescription('Este é um banheiro Masculino, Feminino ou Unissex')
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.cabins()
                .setDescription('Quantas cabines tem neste banheiro?')
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.urinals()
                .setDescription('Quantos mictórios tem neste banheiro? (se aplicável)')
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.localization()
                .setDescription('Dê uma descrição de como chegar a este banheiro.')
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomManagement.image()
                .setDescription('Uma imagem do banheiro')
        ) as SlashCommandBuilder,



    async (interaction, client) => {
        // Apply a rate limit by user here

        const bathroom = new Bathroom(
            {
                id: Date.now().toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
                campus: interaction.options.get('campus')!.value as CampusValues,
                floor: interaction.options.get('andar')!.value as number,
                haveShower: interaction.options.get('tem-chuveiro')!.value as boolean,
                createdBy: interaction.user.id,
                hasHandDryer: interaction.options.get('tem-secador-de-maos')!.value as boolean,
                institute: interaction.options.get('instituto')!.value as string,
                gender: interaction.options.get('genero')?.value as GenderValues | undefined,
                cabins: interaction.options.get('cabines')?.value as number | undefined,
                urinals: interaction.options.get('mictorios')?.value as number | undefined,
                localization: interaction.options.get('localizacao')?.value as string | undefined,
                imagesUrls: interaction.options.get('imagem') ? [interaction.options.get('imagem')?.attachment.url] : undefined,
                mainImageUrl: interaction.options.get('imagem')?.attachment.url,
            }
        );

        await client.database?.bathroom.new(bathroom);

        interaction.reply('Banheiro cadastrado com sucesso!');
    }
);
import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusValues, GenderValues } from '../../classes/database/Bathroom';

export default new Command(
    new SlashCommandBuilder()
        .setName('editar-banheiro')
        .setDescription('Edita um banheiro que você criou pelo ID.')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setDescription('Número de identificação do banheiro.')
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.campus()
                .setDescription('Escolha em qual campus está localizado este banheiro!')
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.institute()
                .setDescription('Em qual instituto da UFBA está localizado o banheiro?')
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.floor()
                .setDescription('Em que andar/piso do prédio está o banheiro? (0 para térreo) (valores negativos para subsolo)')
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.haveShower()
                .setDescription('Tem espaço para banhos neste banheiro?')
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.hasHandDryer()
                .setDescription('Tem secador de mãos neste banheiro?')
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
        .addStringOption(
            new SlashCommandStringOption()
                .setName('url-da-imagem-principal')
                .setDescription('O URL da imagem principal do banheiro.')
        ) as SlashCommandBuilder,



    async (interaction, client) => {
        // Getting options
        const options = {
            id: interaction.options.get('id')!.value as string,
            campus: interaction.options.get('campus')?.value as CampusValues | undefined,
            institute: interaction.options.get('instituto')?.value as string | undefined,
            floor: interaction.options.get('andar')?.value as number | undefined,
            haveShower: interaction.options.get('tem-chuveiro')?.value as boolean | undefined,
            hasHandDryer: interaction.options.get('tem-secador-de-maos')?.value as boolean | undefined,
            gender: interaction.options.get('genero')?.value as GenderValues | undefined,
            cabins: interaction.options.get('cabines')?.value as number | undefined,
            urinals: interaction.options.get('mictorios')?.value as number | undefined,
            localization: interaction.options.get('localizacao')?.value as string | undefined,
            mainImageUrl: interaction.options.get('url-da-imagem-principal')?.value as string | undefined,
        };

        const oldBathroom = client.database!.bathroom.get(options.id);

        // Making some verifications

        if (!oldBathroom) return interaction.reply('Não existe banheiro com este ID!');

        if (interaction.user.id !== oldBathroom.createdBy && !client.admins.includes(interaction.user.id))
            return interaction.reply('Você não tem autorização para editar este banheiro!');

        if (options.mainImageUrl && !oldBathroom.imagesUrls.includes(options.mainImageUrl))
            return interaction.reply('url-da-imagem-principal não é uma imagem do banheiro. Use /adicionar-imagens-a-um-banheiro antes disso!');


        // Edit the bathroom

        const newBathroom = new Bathroom({
            ...oldBathroom,
            updatedAt: new Date(),
            campus: options.campus ?? oldBathroom.campus,
            institute: options.institute ?? oldBathroom.institute,
            floor: options.floor ?? oldBathroom.floor,
            haveShower: options.haveShower ?? oldBathroom.haveShower,
            hasHandDryer: options.hasHandDryer ?? oldBathroom.hasHandDryer,
            gender: options.gender ?? oldBathroom.gender,
            cabins: options.cabins ?? oldBathroom.cabins,
            urinals: options.urinals ?? oldBathroom.urinals,
            localization: options.localization ?? oldBathroom.localization,
            mainImageUrl: options.mainImageUrl ?? oldBathroom.mainImageUrl,
        });

        const response = await interaction.reply('Editando...');

        await client.database!.bathroom.edit(newBathroom);

        response.edit('Banheiro editado.');
    }
);
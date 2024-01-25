import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusValues } from '../../classes/database/Bathroom';

export default new Command(
    new SlashCommandBuilder()
        .setName('edit-bathroom')
        .setDescription('Edits a specific bathroom')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.campus()
                .setRequired(false)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.institute()
                .setRequired(false)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.floor()
                .setRequired(false)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.haveShower()
                .setRequired(false)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.localization()
                .setRequired(false)
        ) 
        .addStringOption(
            new SlashCommandStringOption()
                .setName('main-image-url')
                .setDescription('The banner image-url of the bathroom')
                .setRequired(false)
        ) as SlashCommandBuilder,



    async (interaction, client) => {
        // Getting options
        const options = {
            id: interaction.options.get('id')!.value as string,
            campus: interaction.options.get('campus')?.value as CampusValues | undefined,
            institute: interaction.options.get('institute')?.value as string | undefined,
            floor: interaction.options.get('floor')?.value as number | undefined,
            haveShower: interaction.options.get('have-shower')?.value as boolean | undefined,
            localization: interaction.options.get('localization')?.value as string | undefined,
            mainImageUrl: interaction.options.get('main-image-url')?.value as string | undefined,
        };

        const oldBathroom = client.database!.bathroom.get(options.id);

        // Making some verifications

        if (!oldBathroom) return interaction.reply('There is no bathroom with this ID');

        if (interaction.user.id !== oldBathroom.createdBy && !client.admins.includes(interaction.user.id))
            return interaction.reply('You don\'t have permission to edit this bathroom');

        if (options.mainImageUrl && !oldBathroom.imagesUrls.includes(options.mainImageUrl))
            return interaction.reply('main-image-url is not a image from the bathroom. Use /add-bathroom-images before it');


        // Edit the bathroom

        const newBathroom = new Bathroom({
            ...oldBathroom,
            updatedAt: new Date(),
            campus: options.campus ?? oldBathroom.campus,
            institute: options.institute ?? oldBathroom.institute,
            floor: options.floor ?? oldBathroom.floor,
            haveShower: options.haveShower ?? oldBathroom.haveShower,
            localization: options.localization ?? oldBathroom.localization,
            mainImageUrl: options.mainImageUrl ?? oldBathroom.mainImageUrl,
        });

        const response = await interaction.reply('Editting...');

        await client.database!.bathroom.edit(newBathroom);

        response.edit('Bathroom edited.');
    }
);
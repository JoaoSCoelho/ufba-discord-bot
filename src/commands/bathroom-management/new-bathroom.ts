import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusValues } from '../../classes/database/Bathroom';

export default new Command(
    new SlashCommandBuilder()
        .setName('new-bathroom')
        .setDescription('Creates a new bathroom in database')
        .setDefaultMemberPermissions(8)
        .addStringOption(
            Command.commandOptions.bathroomManagement.campus()
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.institute()
                .setRequired(true)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.floor()
                .setRequired(true)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.haveShower()
                .setRequired(true)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.localization()
                .setRequired(false)
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomManagement.image()
                .setRequired(false)
        ) as SlashCommandBuilder,



    async (interaction, client) => {
        // Apply a rate limit by user here

        const bathroom = new Bathroom(
            {
                id: Date.now().toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
                campus: interaction.options.get('campus')!.value as CampusValues,
                floor: interaction.options.get('floor')!.value as number,
                haveShower: interaction.options.get('have-shower')!.value as boolean,
                createdBy: interaction.user.id,
                institute: interaction.options.get('institute')!.value as string,
                localization: interaction.options.get('localization')?.value as string | undefined,
                imagesUrls: interaction.options.get('image') ? [interaction.options.get('image')?.attachment.url] : undefined,
                mainImageUrl: interaction.options.get('image')?.attachment.url,
            }
        );

        await client.database?.bathroom.new(bathroom);

        interaction.reply('Bathroom successfully created!');
    }
);
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom from '../../classes/database/Bathroom';

export default new Command(
    new SlashCommandBuilder()
        .setName('add-bathroom-images')
        .setDescription('Adds new images to a bathroom.')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setRequired(true)
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomManagement.image()
                .setRequired(true)
                .setName('image-1')
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomManagement.image()
                .setRequired(false)
                .setName('image-2')
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomManagement.image()
                .setRequired(false)
                .setName('image-3')
        ) as SlashCommandBuilder,
    async (interaction, client) => {
        const bathroomId = interaction.options.get('id')!.value as string;
        const image1Url = interaction.options.get('image-1')!.attachment.url;
        const image2Url = interaction.options.get('image-2')?.attachment.url;
        const image3Url = interaction.options.get('image-3')?.attachment.url;
        const imagesUrls = [image1Url];
        if (image2Url) imagesUrls.push(image2Url);
        if (image3Url) imagesUrls.push(image3Url);
        
        const oldBathroom = client.database!.bathroom.get(bathroomId);

        if (!oldBathroom) return interaction.reply('There is no bathroom with this ID');
        if (oldBathroom.imagesUrls.length >= Bathroom.imagesLimit) return interaction.reply('No more space for images in this bathroom');

        if (oldBathroom.imagesUrls.length + imagesUrls.length > Bathroom.imagesLimit) 
            interaction.channel.send(`${oldBathroom.imagesUrls.length + imagesUrls.length - Bathroom.imagesLimit} images will not be added because it would exceed the ${Bathroom.imagesLimit} limit`);

        const newBathroom = new Bathroom({
            ...oldBathroom,
            updatedAt: new Date(),
            imagesUrls: oldBathroom.imagesUrls.concat(imagesUrls)
        });

        const awaitingMessage = await interaction.reply('Adding...');

        await client.database!.bathroom.edit(newBathroom);

        await awaitingMessage.edit('Images added');
    }
);
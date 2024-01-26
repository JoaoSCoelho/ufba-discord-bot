import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom from '../../classes/database/Bathroom';

const data = new SlashCommandBuilder()
    .setName('add-bathroom-images')
    .setDescription('Adds new images to a bathroom.')
    .addStringOption(
        Command.commandOptions.bathroomManagement.id()
            .setRequired(true)
    ) as SlashCommandBuilder;

addAttachmentOptions(data);

export default new Command(
    data,
    async (interaction, client) => {
        // Getting options
        const bathroomId = interaction.options.get('id')!.value as string;

        const imagesUrls = getImagesOptions();

        const oldBathroom = client.database!.bathroom.get(bathroomId);

        // Making verifications
        if (!oldBathroom) return interaction.reply('There is no bathroom with this ID');
        if (oldBathroom.imagesUrls.length >= Bathroom.imagesLimit) return interaction.reply('No more space for images in this bathroom');

        if (oldBathroom.imagesUrls.length + imagesUrls.length > Bathroom.imagesLimit) {
            interaction.channel.send(`${oldBathroom.imagesUrls.length + imagesUrls.length - Bathroom.imagesLimit} images will not be added because it would exceed the ${Bathroom.imagesLimit} limit`);
            imagesUrls.splice(-(oldBathroom.imagesUrls.length + imagesUrls.length - Bathroom.imagesLimit));
        }

        // Editting the bathroom

        // New instance of Bathroom with the new images
        const newBathroom = new Bathroom({
            ...oldBathroom,
            updatedAt: new Date(),
            imagesUrls: oldBathroom.imagesUrls.concat(imagesUrls)
        });

        const awaitingMessage = await interaction.reply('Adding...');

        await client.database!.bathroom.edit(newBathroom);

        await awaitingMessage.edit('Images added');




        function getImagesOptions() {
            const urls: string[] = [];

            for (let i = 0; i < 20; i++) {
                const imageUrl = interaction.options.get(`image-${i + 1}`)?.attachment.url;
                imageUrl && urls.push(imageUrl);
            }

            return urls;
        }
    }
);

function addAttachmentOptions(data: SlashCommandBuilder) {
    for (let i = 0; i < 20; i++) {
        data.addAttachmentOption(
            Command.commandOptions.bathroomManagement.image()
                .setRequired(i === 0 ? true : false)
                .setName(`image-${i + 1}`)
        );
    }
}
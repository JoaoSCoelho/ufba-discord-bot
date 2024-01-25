import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CollectedInteraction, InteractionCollector, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom from '../../classes/database/Bathroom';

export default new Command(
    new SlashCommandBuilder()
        .setName('remove-bathroom-images')
        .setDescription('Removes some images from a specific bathroom')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setRequired(true)
        ) as SlashCommandBuilder,



    async (interaction, client) => {
        const collectorTime = 60000 * 5; // 5 minutes
        const bathroomId = interaction.options.get('id')!.value as string;

        const oldBathroom = client.database!.bathroom.get(bathroomId);

        // Make some verifications

        if (!oldBathroom) return interaction.reply('There is no bathroom with this ID');

        if (interaction.user.id !== oldBathroom.createdBy && !client.admins.includes(interaction.user.id))
            return interaction.reply('You don\'t have permission to edit this bathroom');

        if (!oldBathroom.imagesUrls.length)
            return interaction.reply('Bathroom without images!');



        await interaction.reply({
            ephemeral: true,
            content: `${oldBathroom.imagesUrls.length} images urls found`
        });

        let remainingUrls = oldBathroom.imagesUrls;
        const imagesResponseCollectors: InteractionCollector<CollectedInteraction>[] = [];

        // Sends each image with two buttons
        await Promise.all(oldBathroom.imagesUrls.map(async (imageUrl, index) => {
            // Building each button 
            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel-button-${index}`)
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled();
            const deleteButton = new ButtonBuilder()
                .setCustomId(`delete-button-${index}`)
                .setLabel('Deletar')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder<ButtonBuilder>({
                components: [cancelButton, deleteButton]
            });



            const imageResponse = await interaction.followUp({
                ephemeral: true,
                content: imageUrl,
                components: [row],
            });

            const collector = imageResponse.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: collectorTime,
            });

            imagesResponseCollectors.push(collector);

            // Manage when a image is selected or not
            collector.on('collect', async (i) => {
                if (i.customId === `cancel-button-${index}`) {
                    row.components.splice(
                        0,
                        2,
                        cancelButton.setDisabled(true),
                        deleteButton.setDisabled(false)
                    );
                    remainingUrls.push(imageUrl);
                } else if (i.customId === `delete-button-${index}`) {
                    row.components.splice(
                        0,
                        2,
                        cancelButton.setDisabled(false),
                        deleteButton.setDisabled(true)
                    );
                    remainingUrls = remainingUrls.filter((url) => url !== imageUrl);
                }

                await i.update({
                    content: i.customId === `delete-button-${index}` ? '🗑️ Selected ' + imageUrl : imageUrl,
                    components: [row]
                });
            });
        }));


        // Bulding confirm and cancel button
        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);
        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm-button')
            .setLabel('Delete all selected')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .setComponents(cancelButton, confirmButton);




        const confirmMessage = await interaction.followUp({
            content: 'Confirm here when are selected all images',
            ephemeral: true,
            components: [row]
        });

        const confirmCollector = confirmMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: collectorTime,
        });

        // Managing when the button is pressed
        confirmCollector.on('collect', async (i) => {
            if (i.customId === 'cancel-button') {
                i.update({
                    content: 'Command canceled',
                    components: []
                });
            } 
            
            else if (i.customId === 'confirm-button') {
                if (oldBathroom.imagesUrls.length === remainingUrls.length) {
                    imagesResponseCollectors.forEach((collector) => collector.stop());
                    confirmCollector.stop();

                    i.update({
                        content: 'None selected. Command canceled!',
                        components: []
                    });

                    return;
                }

                const newBathroom = new Bathroom({
                    ...oldBathroom,
                    updatedAt: new Date(),
                    imagesUrls: remainingUrls,
                    mainImageUrl: remainingUrls.includes(oldBathroom.mainImageUrl) ? undefined : oldBathroom.mainImageUrl,
                });

                await client.database!.bathroom.edit(newBathroom);

                i.update({
                    content: `${oldBathroom.imagesUrls.length - remainingUrls.length} images deleted!`,
                    components: []
                });
            }

            imagesResponseCollectors.forEach((collector) => collector.stop());
            confirmCollector.stop();
        });
    }
);
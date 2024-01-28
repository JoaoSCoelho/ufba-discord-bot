import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CollectedInteraction, InteractionCollector, MessageCollectorOptionsParams, MessageComponentType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom from '../../classes/database/Bathroom';

export default new Command(
    new SlashCommandBuilder()
        .setName('remove-bathroom-images')
        .setDescription('Removes some images from a specific bathroom')
        .addStringOption(
            Command.commandOptions.bathroomManagement.id()
                .setDescription('Número de identificação do banheiro.')
                .setRequired(true)
        ) as SlashCommandBuilder,



    async (interaction, client) => {
        const collectorTime = 60000 * 5; // 5 minutes
        const collectorOptions: MessageCollectorOptionsParams<MessageComponentType, boolean> = 
            { filter: (i) => i.user.id === interaction.user.id, time: collectorTime };
        const bathroomId = interaction.options.get('id')!.value as string;

        const oldBathroom = client.database!.bathroom.get(bathroomId);

        // Make some verifications

        if (!oldBathroom) return interaction.reply('There is no bathroom with this ID');

        if (interaction.user.id !== oldBathroom.createdBy && !client.admins.includes(interaction.user.id))
            return interaction.reply('You don\'t have permission to edit this bathroom');

        if (!oldBathroom.imagesUrls.length)
            return interaction.reply('Bathroom without images!');



        await interaction.reply({ content: `${oldBathroom.imagesUrls.length} images urls found`, ephemeral: true });



        let remainingUrls = oldBathroom.imagesUrls;

        // Sends each image with two buttons
        const imagesResponseCollectors: InteractionCollector<CollectedInteraction>[] = 
            await Promise.all(oldBathroom.imagesUrls.map(controlImageSelection));


        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm-button')
            .setLabel('Delete all selected')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>({ components: [confirmButton] });

        const confirmMessage = await interaction.followUp({
            content: 'Confirm here when are selected all images',
            ephemeral: true,
            components: [row]
        });

        const confirmCollector = confirmMessage.createMessageComponentCollector(collectorOptions);

        // Managing when the button is pressed
        confirmCollector.on('collect', async (i) => {
            if (i.customId === 'confirm-button') {
                imagesResponseCollectors.forEach((collector) => collector.stop());
                confirmCollector.stop();

                if (oldBathroom.imagesUrls.length === remainingUrls.length) {
                    i.update({ content: 'None selected. Command canceled!', components: [] });
                    return;
                }

                const newBathroom = new Bathroom({
                    ...oldBathroom,
                    updatedAt: new Date(),
                    imagesUrls: remainingUrls,
                    mainImageUrl: remainingUrls.includes(oldBathroom.mainImageUrl) ? undefined : oldBathroom.mainImageUrl,
                });

                await client.database!.bathroom.edit(newBathroom);

                i.update({ content: `${oldBathroom.imagesUrls.length - remainingUrls.length} images deleted!`, components: [] });
            }
        });





        async function controlImageSelection(imageUrl: string, index: number) {
            const imageResponse = await interaction.followUp({ content: imageUrl, ephemeral: true, components: [rowFactory(false)] });

            const collector = imageResponse.createMessageComponentCollector(collectorOptions);

            // Manage when a image is selected or not
            collector.on('collect', async (i) => {
                const selected = remainingUrls.indexOf(imageUrl) === -1;
                if (i.customId === `checkbox-${index}`) {
                    selected ? remainingUrls.push(imageUrl) : (remainingUrls = remainingUrls.filter((url) => url !== imageUrl));

                    await i.update({ components: [rowFactory(!selected)] });
                }
            });

            return collector;



            function rowFactory(selected: boolean) {
                return new ActionRowBuilder<ButtonBuilder>({
                    components: [CheckBoxFactory(selected)]
                });
            }

            function CheckBoxFactory(selected: boolean) {
                return new ButtonBuilder()
                    .setCustomId(`checkbox-${index}`)
                    .setLabel(`${selected ? '✅' : '⬜'} ${selected ? 'Unselect' : 'Select'}`)
                    .setStyle(ButtonStyle.Danger);
            }
        }
    }
);
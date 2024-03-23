import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageCollectorOptionsParams, MessageComponentType, Snowflake } from 'discord.js';
import CommandExecution from '../../../classes/CommandExecution';
import Bathroom from '../../../classes/database/Bathroom';

export default class RemoveBathroomImagesExecution extends CommandExecution {
    readonly COLLECTOR_TIME = 60000 * 5; // 5 minutes
    readonly collectorOptions: MessageCollectorOptionsParams<MessageComponentType, boolean> = 
        { filter: (i) => i.user.id === this.interaction.user.id, time: this.COLLECTOR_TIME };
    public remainingUrls: string[] = [];

    run = async () => {
        await this.interaction.deferReply();


        /** Defines the time that the collectors will stay active */


        const bathroomId = this.interaction.options.get('id')!.value as Snowflake;

        const bathroom = this.client.database!.bathroom.get(bathroomId);

        



        if (!bathroom) return await this.interaction.followUp('Não existe um banheiro com este ID!');

        if (this.interaction.user.id !== bathroom.createdBy && !this.client.admins.includes(this.interaction.user.id))
            return await this.interaction.followUp('Você não tem permissão para editar este banheiro!');

        if (!bathroom.imagesUrls.length)
            return await this.interaction.followUp('Este banheiro já não possui imagens!');



        await this.interaction.followUp({ content: `**${bathroom.imagesUrls.length}** imagens encontradas`, ephemeral: true });


        /** Saves the images urls that will remain in Bathroom register */
        this.remainingUrls = bathroom.imagesUrls;

        // Sends each image with the select button
        const imagesResponseCollectors = 
            await Promise.all(bathroom.imagesUrls.map(this.controlImageSelection.bind(this)));


        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm-button')
            .setLabel('Deletar as selecionadas')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>({ components: [confirmButton] });

        const confirmMessage = await this.interaction.followUp({
            content: 'Confirme aqui quando selecionar todas as imagens que deseja deletar. (Ação irrevesível)',
            ephemeral: true,
            components: [row]
        });

        const confirmCollector = confirmMessage.createMessageComponentCollector(this.collectorOptions);

        // Managing when the button is pressed
        confirmCollector.on('collect', async (i) => {
            if (i.customId === 'confirm-button') {
                imagesResponseCollectors.forEach((collector) => collector.stop());
                confirmCollector.stop();

                if (bathroom.imagesUrls.length === this.remainingUrls.length) {
                    i.update({ content: 'Nenhuma selecionada. Comando cancelado!', components: [] });
                    return;
                }

                const newBathroom = new Bathroom({
                    ...bathroom,
                    updatedAt: new Date(),
                    imagesUrls: this.remainingUrls,
                    mainImageUrl: this.remainingUrls.includes(bathroom.mainImageUrl!) ? undefined : bathroom.mainImageUrl,
                });

                await this.client.database!.bathroom.edit(newBathroom);

                i.update({ content: `${bathroom.imagesUrls.length - this.remainingUrls.length} imagens deletadas!`, components: [] });
            }
        });





        
    };

    async controlImageSelection(this: RemoveBathroomImagesExecution, imageUrl: string, index: number) {
        const imageResponse = await this.interaction.followUp({ content: imageUrl, ephemeral: true, components: [rowFactory(false)] });

        const collector = imageResponse.createMessageComponentCollector(this.collectorOptions);

        // Manage when a image is selected or not
        collector.on('collect', async (i) => {
            const selected = this.remainingUrls.indexOf(imageUrl) === -1;
            if (i.customId === `checkbox-${index}`) {
                selected ? this.remainingUrls.push(imageUrl) : (this.remainingUrls = this.remainingUrls.filter((url) => url !== imageUrl));

                await i.update({ components: [rowFactory(!selected)] });
            }
        });

        return collector;



        function rowFactory(selected: boolean) {
            return new ActionRowBuilder<ButtonBuilder>({
                components: [checkBoxFactory(selected)]
            });
        }

        function checkBoxFactory(selected: boolean) {
            return new ButtonBuilder()
                .setCustomId(`checkbox-${index}`)
                .setLabel(`${selected ? '✅' : '⬜'} ${selected ? 'Desselecionar' : 'Selecionar'}`)
                .setStyle(ButtonStyle.Secondary);
        }
    }
}
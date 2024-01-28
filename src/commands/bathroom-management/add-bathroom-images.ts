import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom from '../../classes/database/Bathroom';

const data = new SlashCommandBuilder()
    .setName('adicionar-imagens-a-um-banheiro')
    .setDescription('Adiciona novas imagens a um banheiro atravéz de seu ID.')
    .addStringOption(
        Command.commandOptions.bathroomManagement.id()
            .setDescription('Número de identificação do banheiro.')
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
        if (!oldBathroom) return interaction.reply('Não existe um banheiro com este ID!');
        if (oldBathroom.imagesUrls.length >= Bathroom.imagesLimit) return interaction.reply('Não há mais espaço para imagens neste banheiro!');

        if (oldBathroom.imagesUrls.length + imagesUrls.length > Bathroom.imagesLimit) {
            interaction.channel.send(`${oldBathroom.imagesUrls.length + imagesUrls.length - Bathroom.imagesLimit} imagens não serão adicionadas pois ultrapassam o limite de ${Bathroom.imagesLimit} imagens por banheiro.`);
            imagesUrls.splice(-(oldBathroom.imagesUrls.length + imagesUrls.length - Bathroom.imagesLimit));
        }

        // Editting the bathroom

        // New instance of Bathroom with the new images
        const newBathroom = new Bathroom({
            ...oldBathroom,
            updatedAt: new Date(),
            imagesUrls: oldBathroom.imagesUrls.concat(imagesUrls)
        });

        const awaitingMessage = await interaction.reply('Adicionando...');

        await client.database!.bathroom.edit(newBathroom);

        await awaitingMessage.edit('Imagens adicionadas.');




        function getImagesOptions() {
            const urls: string[] = [];

            for (let i = 0; i < 20; i++) {
                const imageUrl = interaction.options.get(`imagem-${i + 1}`)?.attachment.url;
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
                .setDescription('Imagem do banheiro.')
                .setRequired(i === 0 ? true : false)
                .setName(`imagem-${i + 1}`)
        );
    }
}
import { SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import Bathroom from '../../../classes/database/Bathroom';

const data = new SlashCommandBuilder()
    .setName('adicionar-imagens-a-um-banheiro')
    .setDescription('Adiciona novas imagens a um banheiro atravéz de seu ID.')
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.id.name)
            .setDescription('Número de identificação do banheiro.')
            .setRequired(true)
    ) as SlashCommandBuilder;

addAttachmentOptions(data);

function addAttachmentOptions(data: SlashCommandBuilder) {
    for (let i = 0; i < Bathroom.imagesUrls.max; i++) {
        data.addAttachmentOption(
            new SlashCommandAttachmentOption()
                .setDescription('Imagem do banheiro.')
                .setRequired(i === 0)
                .setName(`imagem-${i + 1}`)
        );
    }
}

export default data;
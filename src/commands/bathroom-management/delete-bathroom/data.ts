import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import Bathroom from '../../../classes/database/Bathroom';

export default new SlashCommandBuilder()
    .setName('deletar-banheiro')
    .setDescription('Deleta um banheiro que você criou pelo ID.')
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.id.name)
            .setDescription('Número de identificação do banheiro.')
            .setRequired(true)
    ) as SlashCommandBuilder;
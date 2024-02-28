import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import { levels } from '../../score-system';

export default new Command(
    new SlashCommandBuilder()
        .setName('score')
        .setDescription('Mostra o seu escore de interação neste servidor e o seu nível atual.'),

    async (interaction, client) => {
        const member = client.database!.member.find((member) => member.discordId === interaction.user.id && member.discordGuildId === interaction.guildId);

        if (!member) return interaction.reply('Você não possui pontuação neste servidor!');

        const levelIndex = levels.findIndex(({ targetScore }) => targetScore > member.score);

        interaction.reply(`Você tem \`${member.score}\` pontos e seu nível atual é **Nível ${levelIndex}**`);
    }
);
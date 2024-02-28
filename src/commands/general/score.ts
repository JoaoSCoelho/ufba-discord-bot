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

        // @ts-expect-error erro
        const levelIndex = levels.reduce((prev, curr, currIndex) => {
            if (typeof prev === 'number') return prev as number;

            if (member.score >= prev.targetScore && member.score < curr.targetScore) return currIndex - 1;

            return curr;
        }) as number;

        interaction.reply(`Você tem \`${member.score}\` pontos e seu nível atual é **Nível ${levelIndex + 1}**`);
    }
);
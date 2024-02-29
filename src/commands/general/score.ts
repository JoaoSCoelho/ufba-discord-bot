import { SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';
import { levels } from '../../score-system';

export default new Command(
    new SlashCommandBuilder()
        .setName('score')
        .setDescription('Mostra o seu escore de interação neste servidor e o seu nível atual.')
        .addUserOption(
            new SlashCommandUserOption()
                .setName('membro')
                .setDescription('Você pode buscar o score de um membro específico.')
        ) as SlashCommandBuilder,

    async (interaction, client) => {
        if (!interaction.inGuild()) return;

        const targetMemberId = interaction.options.get('membro')?.user!.id ?? interaction.user.id;
        const guildMember = await client.guilds.cache.get(interaction.guildId)!.members.fetch(targetMemberId);

        const member = client.database!.member.find((member) => {
            return  member.discordId === targetMemberId && member.discordGuildId === interaction.guildId;
        });

        if (!member) return interaction.reply(`${guildMember} não possui pontuação neste servidor!`);

        const levelIndex = levels.findIndex(({ targetScore }) => targetScore > member.score);

        interaction.reply(`${guildMember} tem \`${member.score}\` pontos e seu nível atual é **Nível ${levelIndex}**`);
    }
);
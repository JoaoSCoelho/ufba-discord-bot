import { SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command(
    new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Permite ver o ranking dos membros com mais pontos no server.'),
    async (interaction, client) => {
        if (!interaction.inGuild()) return;

        const guildMembers = client.database!.member.filter((member) => member.discordGuildId === interaction.guildId);
        const sortedMembers = guildMembers.sort((memberA, memberB) => memberB.score - memberA.score).toJSON();

        const userIndexInRanking = sortedMembers.findIndex((member) => member.discordId === interaction.user.id);
        const userPositionInRanking = userIndexInRanking + 1;

        const top100Members = sortedMembers.slice(0, 100);
       
        interaction.reply(`${(await Promise.all(top100Members.map(async (member, index) => {
            const discordMember = await client.guilds.cache.get(interaction.guildId)?.members.fetch(member.discordId);

            return `> ${index + 1}º - **${discordMember?.displayName ?? 'NÃO ENCONTRADO'}**${discordMember ? ` (${discordMember.user.username})` : ''} **\`${member.score}\` pontos**  ID: \`${member.discordId}\``;
        }))).join('\n')}\nSua posição no ranking é **${userPositionInRanking}º**`);
    }
);
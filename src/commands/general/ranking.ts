import { SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';
import { log } from '../..';
import discordAnsi from '../../utils/discord-ansi';
import isObject from '../../utils/isObject';

export default new Command(
    new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Permite ver o ranking dos membros com mais pontos no server.')
        .addUserOption(
            new SlashCommandUserOption()
                .setName('membro')
                .setDescription('Um membro do servidor ao qual você deseja saber a posição no ranking'),
        ) as SlashCommandBuilder,


    async (interaction, client) => {
        if (!interaction.inGuild()) return;

        await interaction.deferReply();


        /** Collection of `Member` from this guild */
        const guildMembers = client.database!.member.filter((member) => member.discordGuildId === interaction.guildId);
        /** Array of `Member` ordered by score ascending */
        const sortedMembers = guildMembers.sort((memberA, memberB) => memberB.score - memberA.score).toJSON();

        /** User to know the position */
        const targetUser = interaction.options.get('membro')?.user ?? interaction.user;
        /** The position in ranking of the `targetUser` */
        const userPositionInRanking = sortedMembers.findIndex((member) => member.discordId === targetUser.id) + 1;

        const top15Members = sortedMembers.slice(0, 15);


        /** Array of formatted lines of rank (using discord ansi codes) */
        const rankingLines = await Promise.all(top15Members.map(async (member, index) => {
            const discordMember = await client.guilds.cache.get(interaction.guildId)?.members.fetch(member.discordId)
                .catch((error) => {
                    if (isObject(error) && error.message === 'Unknown Member') return undefined;

                    log.error(`Erro ao dar fetch em membro de ID: #(${member.discordId})# enquanto executava o comando /#(ranking)# usado por #(@${interaction.user.tag})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(Opções usadas)#:`, interaction.options.data, '\n#(Erro)#:', error);
                    throw error;
                });
                

            /** If the `discordMember.id` is equal to `targetUser.id`, so a ansi code is saved on var, else a empty string is saved on var */ 
            const ansiColorCode = discordMember?.id === targetUser.id ? discordAnsi.getBlueCode() as `\u001b[${number};${number}m` : '';

            return ansiColorCode + `${(index + 1).toString().padStart(2)}º ${(discordAnsi.bold()(((discordMember?.displayName ?? 'NÃO ENCONTRADO') + ' ').padEnd(20, '-')))}${ansiColorCode} ${discordAnsi.bold()(member.score.toString().padEnd(3))} ${ansiColorCode}pontos ${discordMember ? discordAnsi.gray()(`(${member.discordId})`) : ''}`;
        }));



        
        await interaction.followUp(`\`\`\`ansi\n${rankingLines.join('\n')}\n\`\`\`\n${targetUser.id === interaction.user.id ? 'Sua posição' : `A posição de ${targetUser}`} no ranking é **${userPositionInRanking}º**`);
    },

    {
        howToUse: 'Você pode usar apenas /ranking se desejar ver o ranking dos 15 melhores e saber a sua posição no ranking total ou pode usar a opção "membro" para ver a posição de um membro específico no ranking total',
        optionsTutorial: {
            membro: 'Escolha um membro do servidor nessa opção para saber sua posição no ranking total do servidor.'
        }
    }
);
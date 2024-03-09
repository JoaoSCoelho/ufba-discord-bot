import { SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';
import { levels } from '../../score-system';
import isObject from '../../utils/isObject';
import discordAnsi from '../../utils/discord-ansi';
import { log } from '../../classes/LogSystem';

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

        await interaction.deferReply();


        // `PT`: Pega o membro passado na opção member ou, caso não haja, o autor da interação
        const targetMemberId = interaction.options.get('membro')?.user!.id ?? interaction.user.id;

        const guildMember = await client.guilds.cache.get(interaction.guildId)?.members.fetch(targetMemberId)
            .catch((error) => {
                if (isObject(error) && error.message === 'Unknown Member') return undefined;

                log.error(`Erro ao dar fetch em membro de ID: #(${targetMemberId})# enquanto executava o comando /#(score)# usado por #(@${interaction.user.tag})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(Opções usadas)#:`, interaction.options.data, '\n#(Erro)#:', error);
                throw error;
            });


        if (!guildMember) return await interaction.followUp(`Não foi encontrado um membro com o id \`${targetMemberId}\` no servidor`);


        /** The Database `Member` thats match with `guildMember` */
        const member = client.database!.member.find((member) => {
            return member.discordId === targetMemberId && member.discordGuildId === interaction.guildId;
        });


        if (!member) return await interaction.followUp(`${guildMember} não possui pontuação neste servidor!`);


        /** The currentLevel that the member is at */
        const levelIndex = levels.findIndex(({ targetScore }) => targetScore > member.score);

        const currentLevelScore = levelIndex ? levels[levelIndex - 1].targetScore : 0;
        const nextLevelScore = levels[levelIndex].targetScore;

        const scoreObtainedAtCurrentLevel = member.score - currentLevelScore;


        /** `PT`: Quantidade total de blocos de progresso que apareçem na mensagem. 
         * @example 10 → ■■■■■■□□□□ */
        const TOTAL_PROGRESS_BLOCKS = 40;

        const percentOfCurrentLevel = scoreObtainedAtCurrentLevel / (nextLevelScore - currentLevelScore) * 100;
        const progressOfTheCurrentLevel = parseInt((percentOfCurrentLevel / (100 / TOTAL_PROGRESS_BLOCKS)).toString());


        const messageContentLines = [
            /** Mention the `guildMember` */
            guildMember,
            '```ansi',
            `@${guildMember.user.tag}`,
            
            /** @example Lv 1 (100 pts) → Lv 2 (300 pts) faltam 117 pts */
            `Lv ${discordAnsi.bold()(`${levelIndex}`)} (${discordAnsi.bold()(`${currentLevelScore}`)} ${discordAnsi.gray()('pts')}) → Lv ${discordAnsi.bold()(`${levelIndex + 1}`)} (${discordAnsi.bold()(`${nextLevelScore}`)} ${discordAnsi.gray()('pts')}) ${discordAnsi.blue()('faltam')} ${discordAnsi.blue()(`${discordAnsi.bold()(`${nextLevelScore - member.score}`)}`)} ${discordAnsi.blue()('pts')}`,
            
            /** @example 41,5% | Lv 1 ■■■■■■■■■■■■■■■■□□□□□□□□□□□□□□□□□□□□□□□□ 11 */
            `${discordAnsi.bold()(percentOfCurrentLevel.toFixed(1).replace('.', ','))}% ${discordAnsi.gray()('|')} Lv ${discordAnsi.bold()(`${levelIndex}`)} ${discordAnsi.blue()('■'.repeat(progressOfTheCurrentLevel))}${'□'.repeat(TOTAL_PROGRESS_BLOCKS - progressOfTheCurrentLevel)} ${discordAnsi.bold()(`${levelIndex + 1}`)}`,
            
            `Score: ${discordAnsi.bold()(`${member.score}`)}`,
            `Nível: ${discordAnsi.bold()(`${levelIndex}`)}`,
            '```'
        ];

        await interaction.followUp(messageContentLines.join('\n'));
    },

    {
        howToUse: 'Você pode usar apenas /score sem nenhuma opção, e com isso vai receber informações sobre o seu próprio score. Também pode usar /score e passar um membro na opção "membro", com isso receberá informações sobre o score do membro',
        optionsTutorial: {
            membro: 'Escolha um membro do servidor nessa opção para obter informações sobre seu score.'
        }
    }
);
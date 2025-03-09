// File Version: 0.0.1

import { SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import SlashCommand from '../../classes/SlashCommand';
import ScoreSystem from '../../utils/ScoreSystem';
import isObject from '../../utils/isObject';
import discordAnsi from '../../utils/discord-ansi';
import { log } from '../../classes/LogSystem';
import BaseError from '../../Errors/BaseError';
import { Obj } from '../../utils/Obj';

export default class ScoreSlashCommand extends SlashCommand {
    public static readonly data = new SlashCommandBuilder()
        .setName('score')
        .setDescription('Mostra o seu escore de interação neste servidor e o seu nível atual.')
        .addUserOption(
            new SlashCommandUserOption()
                .setName('membro')
                .setDescription('Você pode buscar o score de um membro específico.')
        ) as SlashCommandBuilder;
    public static readonly documentation = {
        howToUse: 'Você pode usar apenas /score sem nenhuma opção, e com isso vai receber informações sobre o seu próprio score. Também pode usar /score e passar um membro na opção "membro", com isso receberá informações sobre o score do membro',
        optionsTutorial: {
            membro: 'Escolha um membro do servidor nessa opção para obter informações sobre seu score.'
        }
    };

    public async execute() {

        if (!this.interaction.inGuild()) return;

        await this.interaction.deferReply();


        // `PT`: Pega o membro passado na opção member ou, caso não haja, o autor da interação
        const targetMemberId = this.interaction.options.get('membro')?.user!.id ?? this.interaction.user.id;

        const guildMember = await this.client.guilds.cache.get(this.interaction.guildId)?.members.fetch(targetMemberId)
            .catch((error: unknown) => {
                if (isObject(error) && (error as Obj).message === 'Unknown Member') return undefined;

                log.error(`Erro ao dar fetch em membro de ID: #(${targetMemberId})#`,
                    'enquanto executava o comando /#(score)#',
                    `usado por #(@${this.interaction.user.tag})#`,
                    `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId})#.`,
                    '\n#(Opções usadas)#:', this.interaction.options.data,
                    '\n#(Erro)#:', error
                );

                BaseError.handle(error);
                throw error;
            });


        if (!guildMember) return await this.interaction.followUp(`Não foi encontrado um membro com o id \`${targetMemberId}\` no servidor`);


        /** The Database `Member` thats match with `guildMember` */
        const member = this.client.database!.member.find((member) => {
            return member.discordId === targetMemberId && member.discordGuildId === this.interaction.guildId;
        });


        if (!member) return await this.interaction.followUp(`${guildMember} não possui pontuação neste servidor!`);


        /** The currentLevel that the member is at */
        const levelIndex = ScoreSystem.levels.findIndex(({ targetScore }) => targetScore > member.score);

        const currentLevelScore = levelIndex ? ScoreSystem.levels[levelIndex - 1].targetScore : 0;
        const nextLevelScore = ScoreSystem.levels[levelIndex].targetScore;

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

        await this.interaction.followUp(messageContentLines.join('\n'));
    }
}
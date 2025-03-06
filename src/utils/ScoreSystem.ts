// File Version: 0.0.2

import { Events, GuildMember, GuildTextBasedChannel, If, Message, PermissionsBitField } from 'discord.js';
import LocalClient from '../classes/LocalClient';
import { log } from '../classes/LogSystem';
import Member from '../classes/database/Member';
import BaseError from '../Errors/BaseError';


/** @note use `init()` method to enable the `ScoreSystem` before starts it */
export default class ScoreSystem<Initialized extends boolean = boolean> {
    static readonly levels = [
        { targetScore: 100 },
        { targetScore: 300 },
        { targetScore: 800 },
        { targetScore: 3_000 },
        { targetScore: 10_000 },
        { targetScore: 20_000 },
        { targetScore: 50_000 },
        { targetScore: 100_000 },
        { targetScore: 300_000 },
        { targetScore: 800_000 },
        { targetScore: 3_000_000 },
        { targetScore: 10_000_000 },
        { targetScore: 20_000_000 },
        { targetScore: 50_000_000 },
        { targetScore: 100_000_000 },
        { targetScore: 300_000_000 },
        { targetScore: 800_000_000 },
        { targetScore: 3_000_000_000 },
        { targetScore: 10_000_000_000 },
        { targetScore: 100_000_000_000 },
        { targetScore: 1_000_000_000_000 },
        { targetScore: 10_000_000_000_000 },
        { targetScore: 100_000_000_000_000 },
    ];

    /** The amount of points that a member gets when sending a message */
    public scorePerMessage = 3;
    private client: If<Initialized, LocalClient<true>, undefined> = undefined as If<Initialized, LocalClient<true>, undefined>;
    private running = false;
    private static runningSystems = new Set<ScoreSystem>();

    /** Sets the client in the `ScoreSystem`
     * @returns `ScoreSystem<true>` Reference to this instance
     */
    public init(client: LocalClient<true>): ScoreSystem<true> {
        this.client = client as If<Initialized, LocalClient<true>, undefined>;
        return this as ScoreSystem<true>;
    }

    /** Starts the score system registering a message listener that computes a new score to a member when he sends a message
     * @note Requires the client attribute to be set
     * @returns `ScoreSystem<True>` Reference to this instance
     */
    public start(): ScoreSystem<true> | void {
        if (this.running) {
            log.warnh('Tentativa de iniciar o sistema de pontuação que está em andamento.',
                'Inicialização do sistema de pontuação abortada.');
            return;
        }
        if (!this.client) {
            log.warn('Tentativa de iniciar o sistema de pontuação sem uma instância do client setada.',
                'Inicialização do sistema de pontuação abortada.'
            );
            return;
        }

        if (ScoreSystem.runningSystems.size > 0) {
            log.warn('Iniciando um novo sistema de pontuação.',
                'Um outro sistema está em execução.');
        }

        this.client.on(Events.MessageCreate, this.onMessage.bind(this as ScoreSystem<true>));

        this.running = true;
        ScoreSystem.runningSystems.add(this);

        log.infoh(`Sistema de pontuação de membros iniciado com #(${this.scorePerMessage})# pontos por mensagem`);
        return this as ScoreSystem<true>;
    }

    /** Stops the score system unregistering the message listener that computes a new score to a member when he sends a message 
     * @returns `ScoreSystem<True>` Reference to this instance
    */
    public stop(): ScoreSystem<true> | void {
        if (!this.running) {
            log.warnh('Tentativa de parar o sistema de pontuação que não está em andamento.',
                'Parada do sistema de pontuação abortada.');
            return;
        }
        if (!this.client) {
            log.warnh('Tentativa de parar o sistema de pontuação sem uma instância do client setada.',
                'Parada do sistema de pontuação abortada.'
            );
            return;
        }

        const removedFromRunningSystems = ScoreSystem.runningSystems.delete(this);
        if (!removedFromRunningSystems) {
            log.warnh('Sistema de pontuação de membros não foi encontrado na lista de sistemas em execução.');
        }

        this.client.off(Events.MessageCreate, this.onMessage);
        this.running = false;
        log.infoh('Sistema de pontuação de membros parado.');
        return this as ScoreSystem<true>;
    }

    /** Computes a new pontuation to a member when he sends a message
     * @param message The message that the member sent
     */
    private async onMessage(this: ScoreSystem<true>, message: Message<boolean>) {
        if (!message.inGuild()) return;
        if (message.author.bot) return;
        if (!message.member) return;
        if (message.content.length < 3) return; // Filter only significative messages


        /** The database member that match with the message member */
        const dbMember = this.client.database.member.find((member) =>
            member.discordId === message.member!.id && member.discordGuildId === message.guild.id
        );

        if (!dbMember) {
            const createdMember = await this.addMemberWithScore(message.member)
                .catch((error: unknown) => {
                    if (!BaseError.isHandled(error)) {
                        log.error('Erro ao adicionar membro ao banco de dados ao computar seu score.',
                            '\n#(GuildMember)#:', message.member,
                            '\n#(Erro)#:', error);
                    }

                    return null;
                });
            if (!createdMember) return;
        } else {
            const result = await this.addScoreToMember(dbMember, message.member)
                .then(() => true)
                .catch((error: unknown) => {
                    if (!BaseError.isHandled(error)) {
                        log.error('Erro ao adicionar score ao membro.',
                            '\n#(Member)#:', dbMember,
                            '\n#(GuildMember)#:', message.member,
                            '\n#(Erro)#:', error);
                    }

                    return null;
                });

            if (!result) return;
        }

        const updatedMember = this.client.database.member.find((member) =>
            member.discordId === message.member!.id && member.discordGuildId === message.guild.id
        );

        if (!updatedMember) {
            log.error(`Membro #(@${message.member.user.tag})#`,
                `do servidor #(${message.member.guild.name})#`,
                'não foi encontrado no banco de dados depois de computar seu score.',
                '\n#(GuildMember)#:', message.member
            );
            return;
        };

        /**
         * The level that the member has achieved after updating their score.
         * This value is determined by checking if the member has passed to the next level.
         */
        const achievedLevel = this.havePassedToNextLevel(updatedMember, dbMember);

        if (achievedLevel > 0) {
            await this.sendNextLevelMessage(message.member, message.channel, achievedLevel)
                .catch((error: unknown) => {
                    if (!BaseError.isHandled(error)) {
                        if (error instanceof Error && error.message === 'Bot doesn\'t have permission to send messages in the channel') {
                            log.warnh(`O bot não tem permissão para enviar mensagens no canal #(#${message.channel.name})#`,
                                `do servidor #(${message.member!.guild.name})#`,
                                `para o usuário #(@${message.member!.user.tag})#.`);
                        } else {
                            log.error('Erro ao enviar mensagem de proximo nivel.',
                                '\n#(Nível)#:', achievedLevel,
                                '\n#(GuildMember)#:', message.member,
                                '\n#(GuildTextBasedChannel)#:', message.channel,
                                '\n#(Erro)#:', error);
                        }
                    }
                });
        }
    }


    /**
     * Adds a new member to the database, with the default score of the system.
     * @param guildMember The instance of the guild member that will be added.
     * @returns `Member` The instance of the member that was added.
     */
    private async addMemberWithScore(this: ScoreSystem<true>, guildMember: GuildMember) {
        log.loadingh(`Adicionando membro #(@${guildMember.user.tag})#`,
            `do servidor #(${guildMember.guild.name})# ao banco de dados.`);

        const newMember = new Member({
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            discordGuildId: guildMember.guild.id,
            discordId: guildMember.id,
            score: this.scorePerMessage
        });

        await this.client.database.member.new(newMember)
            .then(() => {
                log.successh(`Membro #(@${guildMember.user.tag})#`,
                    `do servidor #(${guildMember.guild.name})# adicionado ao banco de dados`,
                    `com #(${newMember.score})# pontos de score.`);
            })
            .catch((error: unknown) => {
                if (!BaseError.isHandled(error)) {
                    log.error(`Erro ao adicionar membro #(@${guildMember.user.tag})#`,
                        `do servidor #(${guildMember.guild.name})# ao banco de dados.`,
                        '\n#(Membro)#:', newMember,
                        '\n#(Erro)#:', error);
                    BaseError.handle(error);
                }
                throw error;
            });

        return newMember;
    }

    /**
     * Adds the score of a member to the database.
     * 
     * @param dbMember A instance of the member in the database.
     * @param guildMember A instance of the member in the server.
     */
    private async addScoreToMember(this: ScoreSystem<true>, dbMember: Member, guildMember: GuildMember) {
        log.loadingh(`Adding #(${this.scorePerMessage})# points of score to member #(@${guildMember.user.tag})#`,
            `from server #(${guildMember.guild.name})#.`);

        const newMemberData = {
            ...dbMember,
            updatedAt: new Date(),
            score: dbMember.score + this.scorePerMessage,
        };

        await this.client.database?.member.edit(newMemberData)
            .then(() => {
                log.successh(`Membro #(@${guildMember.user.tag})#`,
                    `do servidor #(${guildMember.guild.name})# recebeu #(${this.scorePerMessage})# pontos de score`,
                    `e possui agora #(${newMemberData.score})# ao total.`);
            })
            .catch((error: unknown) => {
                if (!BaseError.isHandled(error)) {
                    log.error(`Erro ao adicionar score ao membro #(@${guildMember.user.tag})#`,
                        `do servidor #(${guildMember.guild.name})#.`,
                        '\n#(Data)#:', newMemberData,
                        '\n#(Erro)#:', error
                    );
                    BaseError.handle(error);
                }
                throw error;
            });
    }

    /** 
     * Verifies if the member has passed to the next level.
     * @param updatedMember The instance of the member with the updated score
     * @param oldMember The instance of the member with the old score
     * @returns `number` The level that the member passed to.\
     * If the member has not passed to any level, returns `0`.
     */
    private havePassedToNextLevel(updatedMember: Member, oldMember: Member | undefined) {
        const oldScore = oldMember?.score ?? 0;
        const newScore = updatedMember.score;

        // Passes for each level to verify if the member passed to the next level
        return ScoreSystem.levels.findIndex(({ targetScore }) => oldScore < targetScore && newScore >= targetScore) + 1;
    }

    /** Sends a next level message for the member in a channel.
     * @param guildMember The instance of the member that passed to the next level
     * @param channel The channel where the message will be sent
     * @param level The level that the member passed to
     */
    private async sendNextLevelMessage(guildMember: GuildMember, channel: GuildTextBasedChannel, level: number) {
        log.infoh(`O membro #(@${guildMember.user.tag})#`,
            `do servidor #(${guildMember.guild.name})# passou para o nível #(${level})#.`);


        if (!guildMember.guild.members.me?.permissionsIn(channel).has(PermissionsBitField.Flags.SendMessages)) {
            throw new BaseError('Bot doesn\'t have permission to send messages in the channel');
        };

        const messageContent = `Parabéns ${guildMember}, você passou para o level ${level}`;

        await channel.send(messageContent)
            .catch((error: unknown) => {
                log.error(`Erro ao enviar resposta "#(${messageContent})#"`,
                    `para o usuário #(@${guildMember.user.tag})#`,
                    `no canal #(#${channel.name})#`,
                    `no servidor #(${guildMember.guild.name})#.`,
                    '\n#(Erro)#:', error);

                BaseError.handle(error);

                throw error ?? new Error('Unknown error');
            });
    }
}
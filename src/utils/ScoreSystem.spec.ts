import { ClientOptions, Collection, Events, GuildMember, Message } from 'discord.js';
import LocalClient from '../classes/LocalClient';
import ScoreSystem from './ScoreSystem';
import { log } from '../classes/LogSystem';
import Member from '../classes/database/Member';

jest.mock('../classes/LocalClient', () => ({
    __esModule: true,
    default: class LocalClient {
        constructor(options: unknown) { options; }
    }
}));
jest.mock('../classes/LogSystem', () => ({
    log: {
        loading: jest.fn(),
        success: jest.fn(),
        successh: jest.fn(),
        warn: jest.fn(),
        warnh: jest.fn(),
        info: jest.fn(),
        infoh: jest.fn(),
        error: jest.fn(),
    },
}));

describe('ScoreSystem', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    describe('init', () => {
        it('should set the client in the ScoreSystem', () => {
            const client = new LocalClient({} as unknown as ClientOptions) as LocalClient<true>;
            const scoreSystem = new ScoreSystem();
            scoreSystem.init(client);
            expect(scoreSystem['client']).toBe(client);
        });
    });

    describe('start', () => {
        it('should start the score system', () => {
            const mockClient = {
                on: jest.fn(),
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;
            scoreSystem['onMessage'] = jest.fn();
            scoreSystem.start();
            expect(scoreSystem['running']).toBe(true);
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(true);
            expect(mockClient.on).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));
        });

        it('should not start the score system if it is already running', () => {
            const mockClient = {
                on: jest.fn(),
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;
            scoreSystem['running'] = true;

            scoreSystem.start();

            expect(mockClient.on).not.toHaveBeenCalled();
            expect(log.warnh).toHaveBeenCalledWith('Tentativa de iniciar o sistema de pontuação que está em andamento.', 'Inicialização do sistema de pontuação abortada.');
        });

        it('should not start the score system if no client is set', () => {
            const scoreSystem = new ScoreSystem();

            scoreSystem.start();

            expect(log.warn).toHaveBeenCalledWith('Tentativa de iniciar o sistema de pontuação sem uma instância do client setada.', 'Inicialização do sistema de pontuação abortada.');
            expect(scoreSystem['running']).toBe(false);
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(false);
        });

        it('should alert if has more than one score system running', () => {
            const mockClient = {
                on: jest.fn(),
            } as unknown as LocalClient<true>;



            const scoreSystem2 = new ScoreSystem();
            scoreSystem2['client'] = mockClient;
            scoreSystem2.start(); // Leave a system running

            jest.clearAllMocks();
            jest.resetAllMocks();

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;

            scoreSystem.start();

            expect(log.warn).toHaveBeenCalledWith('Iniciando um novo sistema de pontuação.', 'Um outro sistema está em execução');
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(true);
            expect(scoreSystem['running']).toBe(true);
            expect(ScoreSystem['runningSystems'].has(scoreSystem2)).toBe(true);
            expect(mockClient.on).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));
        });
    });

    describe('stop', () => {
        it('should stop the score system', () => {
            const mockClient = {
                off: jest.fn(),
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;
            scoreSystem['running'] = true;
            ScoreSystem['runningSystems'].add(scoreSystem);

            scoreSystem.stop();

            expect(mockClient.off).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));
            expect(scoreSystem['running']).toBe(false);
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(false);
        });
    });

    describe('onMessage', () => {
        it('should ignore if the message is not from a guild', () => {
            const scoreSystem = new ScoreSystem();
            const mockMessage = {
                inGuild: () => false,
            } as unknown as Message<boolean>;

            scoreSystem['addMemberWithScore'] = jest.fn();
            scoreSystem['addScoreToMember'] = jest.fn();

            scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it('should ignore if the message is from a bot', () => {
            const scoreSystem = new ScoreSystem();
            const mockMessage = {
                inGuild: jest.fn().mockReturnValue(true),
                author: {
                    bot: true,
                },
            } as unknown as Message<boolean>;

            scoreSystem['addMemberWithScore'] = jest.fn();
            scoreSystem['addScoreToMember'] = jest.fn();

            scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it('should ignore if the message is less than 3 characters', () => {
            const scoreSystem = new ScoreSystem();
            const mockMessage = {
                inGuild: jest.fn().mockReturnValue(true),
                author: {
                    bot: false,
                },
                member: {} as unknown as GuildMember,
                content: 'a',
            } as unknown as Message<boolean>;

            scoreSystem['addMemberWithScore'] = jest.fn();
            scoreSystem['addScoreToMember'] = jest.fn();

            scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it('should call addScoreToMember', () => {
            const mockMessage = {
                inGuild: jest.fn().mockReturnValue(true),
                author: {
                    bot: false,
                },
                guild: {
                    id: '456'
                },
                member: {
                    id: '123',
                    guild: {
                        id: '456'
                    }
                } as unknown as GuildMember,
                content: 'test',
            } as unknown as Message<boolean>;

            const mockDatabase = {
                member: new Collection([
                    [
                        '1',
                        {
                            discordId: '123',
                            discordGuildId: '456',
                            score: 0,
                        }
                    ]
                ]),
            };

            const mockClient = {
                database: mockDatabase,
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;

            scoreSystem['addMemberWithScore'] = jest.fn();
            scoreSystem['addScoreToMember'] = jest.fn();

            scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).toHaveBeenCalled();
        });

        it('should call addMemberWithScore', () => {
            const mockMessage = {
                inGuild: jest.fn().mockReturnValue(true),
                author: {
                    bot: false,
                },
                guild: {
                    id: '456'
                },
                member: {
                    id: '123',
                    guild: {
                        id: '456'
                    }
                } as unknown as GuildMember,
                content: 'test',
            } as unknown as Message<boolean>;

            const mockDatabase = {
                member: new Collection(),
            };

            const mockClient = {
                database: mockDatabase,
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;

            scoreSystem['addMemberWithScore'] = jest.fn(async () => {
                const mockMember = {
                    discordId: '123',
                    discordGuildId: '456',
                    score: 0,
                } as unknown as Member;

                mockDatabase.member.set(
                    '1',
                    mockMember
                );

                return mockMember;
            });
            scoreSystem['addScoreToMember'] = jest.fn();

            scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it('should call sendNextLevelMessage', async () => {
            const mockGuild = {
                id: '456'
            };
            const mockGuildMember = {
                id: '123',
                guild: mockGuild
            };
            const mockChannel = {};
            const mockMessage = {
                inGuild: jest.fn().mockReturnValue(true),
                author: {
                    bot: false,
                },
                guild: mockGuild,
                member: mockGuildMember,
                content: 'test',
                channel: mockChannel,
            } as unknown as Message<boolean>;
            const mockDatabase = {
                member: new Collection([
                    [
                        '1',
                        {
                            discordId: '123',
                            discordGuildId: '456',
                            score: ScoreSystem.levels[0].targetScore - 1,
                        }
                    ]
                ]),
            };
            const mockClient = {
                database: mockDatabase,
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;

            scoreSystem['addMemberWithScore'] = jest.fn();
            scoreSystem['addScoreToMember'] = jest.fn(async (dbMember: Member) => {
                mockDatabase.member.set('1', {
                    ...dbMember,
                    score: ScoreSystem.levels[0].targetScore,
                });
            });

            scoreSystem['sendNextLevelMessage'] = jest.fn();

            await scoreSystem['onMessage'](mockMessage);


            expect(scoreSystem['sendNextLevelMessage']).toHaveBeenCalledWith(mockGuildMember, mockChannel, 1);
        });
    });



});
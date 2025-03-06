// File Version: 0.0.2

import { ClientOptions, Collection, Events, Guild, GuildMember, GuildMemberManager, GuildTextBasedChannel, Message, User } from 'discord.js';
import LocalClient from '../classes/LocalClient';
import ScoreSystem from './ScoreSystem';
import { log } from '../classes/LogSystem';
import Member from '../classes/database/Member';
import DbCollection from '../database/DbCollection';
import Database from '../database/Database';
import BaseError from '../Errors/BaseError';

jest.mock('../classes/LocalClient', () => ({
    __esModule: true,
    default: class LocalClient {
        constructor(options: unknown) { options; }
    }
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
            const initedScoreSystem = scoreSystem.init(client);
            expect(scoreSystem['client']).toBe(client);
            expect(initedScoreSystem).toBe(scoreSystem);
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
            const startedScoreSystem = scoreSystem.start();
            expect(startedScoreSystem).toBe(scoreSystem);
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

            const startedScoreSystem = scoreSystem.start();
            expect(startedScoreSystem).toBeUndefined();
            expect(mockClient.on).not.toHaveBeenCalled();
            expect(log.warnh).toHaveBeenCalledWith('Tentativa de iniciar o sistema de pontuação que está em andamento.', 'Inicialização do sistema de pontuação abortada.');
        });

        it('should not start the score system if no client is set', () => {
            const scoreSystem = new ScoreSystem();

            const startedScoreSystem = scoreSystem.start();

            expect(startedScoreSystem).toBeUndefined();
            expect(log.warn).toHaveBeenCalledWith('Tentativa de iniciar o sistema de pontuação sem uma instância do client setada.', 'Inicialização do sistema de pontuação abortada.');
            expect(scoreSystem['running']).toBe(false);
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(false);
        });

        it('should start but alert if has more than one score system running', () => {
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

            const startedScoreSystem = scoreSystem.start();

            expect(startedScoreSystem).toBe(scoreSystem);
            expect(log.warn).toHaveBeenCalledWith('Iniciando um novo sistema de pontuação.', 'Um outro sistema está em execução.');
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

            const stoppedScoreSystem = scoreSystem.stop();

            expect(stoppedScoreSystem).toBe(scoreSystem);
            expect(mockClient.off).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));
            expect(scoreSystem['running']).toBe(false);
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(false);
        });

        it('should stop the score system but alert if it is not in the running systems', () => {
            const mockClient = {
                off: jest.fn(),
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;
            scoreSystem['running'] = true;

            const stoppedScoreSystem = scoreSystem.stop();

            expect(stoppedScoreSystem).toBe(scoreSystem);
            expect(mockClient.off).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));
            expect(scoreSystem['running']).toBe(false);
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(false);
            expect(log.warnh).toHaveBeenCalledWith('Sistema de pontuação de membros não foi encontrado na lista de sistemas em execução.');
        });

        it('should not stop the score system if it is not running', () => {
            const mockClient = {
                off: jest.fn(),
            } as unknown as LocalClient<true>;
            const scoreSystem = new ScoreSystem();
            scoreSystem['running'] = false;
            scoreSystem['client'] = mockClient;
            ScoreSystem['runningSystems'].add(scoreSystem);

            const stoppedScoreSystem = scoreSystem.stop();

            expect(stoppedScoreSystem).toBeUndefined();
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(true);
            expect(mockClient.off).not.toHaveBeenCalled();
            expect(log.infoh).not.toHaveBeenCalled();
            expect(log.warnh).toHaveBeenCalledWith(
                'Tentativa de parar o sistema de pontuação que não está em andamento.',
                'Parada do sistema de pontuação abortada.'
            );
        });

        it('should not stop the score system if it hasn\'t client set', () => {
            const scoreSystem = new ScoreSystem();
            scoreSystem['running'] = true;
            ScoreSystem['runningSystems'].add(scoreSystem);

            const stoppedScoreSystem = scoreSystem.stop();

            expect(stoppedScoreSystem).toBeUndefined();
            expect(log.warnh).toHaveBeenCalledWith('Tentativa de parar o sistema de pontuação sem uma instância do client setada.', 'Parada do sistema de pontuação abortada.');
            expect(scoreSystem['running']).toBe(true);
            expect(ScoreSystem['runningSystems'].has(scoreSystem)).toBe(true);
        });
    });

    describe('onMessage', () => {
        it('should ignore if the message is not from a guild', async () => {
            const scoreSystem = new ScoreSystem();
            const mockMessage = {
                inGuild: () => false,
            } as unknown as Message<boolean>;

            scoreSystem['addMemberWithScore'] = jest.fn();
            scoreSystem['addScoreToMember'] = jest.fn();

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it('should ignore if the message is from a bot', async () => {
            const scoreSystem = new ScoreSystem();
            const mockMessage = {
                inGuild: jest.fn().mockReturnValue(true),
                author: {
                    bot: true,
                },
            } as unknown as Message<boolean>;

            scoreSystem['addMemberWithScore'] = jest.fn();
            scoreSystem['addScoreToMember'] = jest.fn();

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it.todo('should ignore if the message is from a user that is not a guild member');

        it('should ignore if the message is less than 3 characters', async () => {
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

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it('should call addScoreToMember', async () => {
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
            scoreSystem['addMemberWithScore'] = jest.fn(async () => ({} as Member));
            scoreSystem['addScoreToMember'] = jest.fn(async () => { });

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).not.toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).toHaveBeenCalled();
        });

        it('should log error if addScoreToMember fails', async () => {
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
            } as Database;
            const mockClient = {
                database: mockDatabase,
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem['client'] = mockClient;
            scoreSystem['addMemberWithScore'] = jest.fn(async () => ({} as Member));
            scoreSystem['addScoreToMember'] = jest.fn(async () => { throw new Error('Test Error'); });
            scoreSystem['havePassedToNextLevel'] = jest.fn();

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addScoreToMember']).toHaveBeenCalled();
            expect(log.error).toHaveBeenCalled();
            expect(scoreSystem['havePassedToNextLevel']).not.toHaveBeenCalled();
        });

        it('should call addMemberWithScore', async () => {
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

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).toHaveBeenCalled();
            expect(scoreSystem['addScoreToMember']).not.toHaveBeenCalled();
        });

        it('should log error if addMemberWithScore fails', async () => {
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
            scoreSystem['havePassedToNextLevel'] = jest.fn();
            scoreSystem['addMemberWithScore'] = jest.fn(async () => { throw new Error(); });
            scoreSystem['addScoreToMember'] = jest.fn();

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['addMemberWithScore']).toHaveBeenCalled();
            expect(log.error).toHaveBeenCalled();
            expect(scoreSystem['havePassedToNextLevel']).not.toHaveBeenCalled();
        });

        it('should log error if after add/update the member, it is not found', async () => {
            const mockGuild = {
                id: '456'
            };
            const mockUser = {
                tag: 'mockUser',
            };
            const mockGuildMember = {
                id: '123',
                guild: mockGuild,
                user: mockUser
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
            scoreSystem['addScoreToMember'] = jest.fn(async () => {
                mockDatabase.member.clear(); // Simulates a database drop at the same time of updating
            });
            scoreSystem['sendNextLevelMessage'] = jest.fn(async () => { });

            await scoreSystem['onMessage'](mockMessage);

            expect(log.error).toHaveBeenCalled();
            expect(scoreSystem['sendNextLevelMessage']).not.toHaveBeenCalled();
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

            scoreSystem['sendNextLevelMessage'] = jest.fn(async () => { });

            await scoreSystem['onMessage'](mockMessage);


            expect(scoreSystem['sendNextLevelMessage']).toHaveBeenCalledWith(mockGuildMember, mockChannel, 1);
        });

        it('should alert if the bot doesn\'t have permissions to send messages in the channel when sending next level message', async () => {
            const mockGuild = {
                id: '456'
            };
            const mockUser = {
                tag: 'mockUser',
            };
            const mockGuildMember = {
                id: '123',
                guild: mockGuild,
                user: mockUser
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

            scoreSystem['sendNextLevelMessage'] = jest.fn(async () => { throw new BaseError('Bot doesn\'t have permission to send messages in the channel'); });

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['sendNextLevelMessage']).toHaveBeenCalledWith(mockGuildMember, mockChannel, 1);
            expect(log.error).not.toHaveBeenCalled();
            expect(log.warnh).toHaveBeenCalled();
        });

        it('should log error if sendNextLevelMessage fails', async () => {
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

            scoreSystem['sendNextLevelMessage'] = jest.fn(async () => { throw new Error(); });

            await scoreSystem['onMessage'](mockMessage);

            expect(scoreSystem['sendNextLevelMessage']).toHaveBeenCalledWith(mockGuildMember, mockChannel, 1);
            expect(log.error).toHaveBeenCalled();
            expect(log.warn).not.toHaveBeenCalled();
        });
    });

    describe('addMemberWithScore', () => {
        it('should call new of database and return the new member', async () => {
            const mockUser = {
                tag: 'mockUserTag'
            } as unknown as User;
            const mockGuild = {
                name: 'mockGuildName',
                id: '345',
            } as unknown as Guild;
            const mockGuildMember = {
                id: '123',
                guild: mockGuild,
                user: mockUser
            } as unknown as GuildMember;
            const mockDatabaseMember = {
                new: jest.fn(async () => { })
            } as unknown as DbCollection<Member>;
            const mockDatabase = {
                member: mockDatabaseMember
            } as unknown as Database;
            const mockClient = {
                database: mockDatabase,
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem.init(mockClient); // Prev tested method
            const resultMember = await scoreSystem['addMemberWithScore'](mockGuildMember);


            expect(resultMember).toBeInstanceOf(Member);
            expect(resultMember.discordId).toEqual(mockGuildMember.id);
            expect(resultMember.discordGuildId).toEqual(mockGuild.id);
            expect(resultMember.score).not.toBeLessThanOrEqual(1); // > 0
            expect(mockDatabase.member.new).toHaveBeenCalledWith(expect.objectContaining({
                discordId: mockGuildMember.id,
                discordGuildId: mockGuild.id,
                score: resultMember.score
            }));
            expect(log.successh).toHaveBeenCalled();
        });

        it('should throw an error if new of database fails', async () => {
            const mockUser = {
                tag: 'mockUserTag'
            } as unknown as User;
            const mockGuild = {
                name: 'mockGuildName',
                id: '345',
            } as unknown as Guild;
            const mockGuildMember = {
                id: '123',
                guild: mockGuild,
                user: mockUser
            } as unknown as GuildMember;
            const mockDatabaseMember = {
                new: jest.fn(async () => { throw new Error(); })
            } as unknown as DbCollection<Member>;
            const mockDatabase = {
                member: mockDatabaseMember
            } as unknown as Database;
            const mockClient = {
                database: mockDatabase,
            } as unknown as LocalClient<true>;

            const scoreSystem = new ScoreSystem();
            scoreSystem.init(mockClient); // Prev tested method
            const resultMember = scoreSystem['addMemberWithScore'](mockGuildMember);

            await expect(resultMember).rejects.toThrow();
        });
    });

    describe('addScoreToMember', () => {
        it('should call edit of database', async () => {
            const mockGuild = {
                name: 'mockGuildName',
            } as Guild;
            const mockUser = {
                tag: 'mockUserTag'
            } as User;
            const mockGuildMember = {
                guild: mockGuild,
                user: mockUser
            } as GuildMember;
            const mockMember = {
                score: 46
            } as Member;
            const mockDatabaseMember = {
                edit: jest.fn(async () => { }),
            } as unknown as DbCollection<Member>;
            const mockDatabase = {
                member: mockDatabaseMember
            } as Database;
            const mockClient = {
                database: mockDatabase,
            } as LocalClient<true>;
            const scoreSystem = new ScoreSystem();
            scoreSystem.init(mockClient);

            await scoreSystem['addScoreToMember'](mockMember, mockGuildMember);

            expect(mockDatabaseMember.edit).toHaveBeenCalledWith(expect.objectContaining({
                score: mockMember.score + scoreSystem.scorePerMessage,
            }));
        });

        it('should throw an error if edit of database fails', async () => {
            const mockGuild = {
                name: 'mockGuildName',
            } as Guild;
            const mockUser = {
                tag: 'mockUserTag'
            } as User;
            const mockGuildMember = {
                guild: mockGuild,
                user: mockUser
            } as GuildMember;
            const mockMember = {
                score: 46
            } as Member;
            const mockDatabaseMember = {
                edit: jest.fn().mockRejectedValue(new Error()),
            } as unknown as DbCollection<Member>;
            const mockDatabase = {
                member: mockDatabaseMember
            } as Database;
            const mockClient = {
                database: mockDatabase,
            } as LocalClient<true>;
            const scoreSystem = new ScoreSystem();
            scoreSystem.init(mockClient);

            await expect(scoreSystem['addScoreToMember'](mockMember, mockGuildMember)).rejects.toThrow();
            expect(log.error).toHaveBeenCalled();
        });
    });

    describe('havePassedToNextLevel', () => {
        it('should return the level that the member passed to when he hits exactly the target', () => {
            const mockOldMember = {
                score: ScoreSystem.levels[0].targetScore - 1
            } as Member;
            const mockUpdatedMember = {
                score: ScoreSystem.levels[0].targetScore
            } as Member;

            const scoreSystem = new ScoreSystem();

            const result = scoreSystem['havePassedToNextLevel'](mockUpdatedMember, mockOldMember);

            expect(result).toBe(1);
        });

        it('should return the level that the member passed to when he passes the target', () => {
            const mockOldMember = {
                score: ScoreSystem.levels[1].targetScore - 1
            } as Member;
            const mockUpdatedMember = {
                score: ScoreSystem.levels[1].targetScore + 1
            } as Member;

            const scoreSystem = new ScoreSystem();

            const result = scoreSystem['havePassedToNextLevel'](mockUpdatedMember, mockOldMember);

            expect(result).toBe(2);
        });

        it('should return 0 when the member did not pass to another level', () => {
            const mockOldMember = {
                score: ScoreSystem.levels[2].targetScore - 10
            } as Member;
            const mockUpdatedMember = {
                score: ScoreSystem.levels[2].targetScore - 5
            } as Member;

            const scoreSystem = new ScoreSystem();

            const result = scoreSystem['havePassedToNextLevel'](mockUpdatedMember, mockOldMember);

            expect(result).toBe(0);
        });
    });

    describe('sendNextLevelMessage', () => {
        it('should call send of channel with the next level message', async () => {
            const mockUser = {
                tag: 'mockUserTag'
            } as User;
            const mockPermissionsBitField = {
                has: jest.fn(() => true)
            };
            const mockClientMember = {
                permissionsIn: jest.fn(() => (mockPermissionsBitField)),
            };
            const mockGuildMembers = {
                me: mockClientMember
            } as unknown as GuildMemberManager;
            const mockGuild = {
                name: 'mockGuildName',
                members: mockGuildMembers
            } as Guild;
            const mockGuildMember = {
                user: mockUser,
                guild: mockGuild
            } as GuildMember;
            const mockChannel = {
                name: 'mockChannelName',
                send: jest.fn(() => Promise.resolve())
            } as unknown as GuildTextBasedChannel;
            const scoreSystem = new ScoreSystem();

            await scoreSystem['sendNextLevelMessage'](mockGuildMember, mockChannel, 1);

            expect(mockChannel.send).toHaveBeenCalled();
            expect(log.error).not.toHaveBeenCalled();
        });

        it('should throw an error if the bot does\'t have permissions to send messages in the channel', async () => {
            const mockUser = {
                tag: 'mockUserTag'
            } as User;
            const mockPermissionsBitField = {
                has: jest.fn(() => false)
            };
            const mockClientMember = {
                permissionsIn: jest.fn(() => (mockPermissionsBitField)),
            };
            const mockGuildMembers = {
                me: mockClientMember
            } as unknown as GuildMemberManager;
            const mockGuild = {
                name: 'mockGuildName',
                members: mockGuildMembers
            } as Guild;
            const mockGuildMember = {
                user: mockUser,
                guild: mockGuild
            } as GuildMember;
            const mockChannel = {
                name: 'mockChannelName',
                send: jest.fn(() => Promise.resolve())
            } as unknown as GuildTextBasedChannel;
            const scoreSystem = new ScoreSystem();

            await expect(scoreSystem['sendNextLevelMessage'](mockGuildMember, mockChannel, 1)).rejects.toThrow(BaseError);
            expect(mockChannel.send).not.toHaveBeenCalled();
        });

        it('should throw an error if send of channel fails', async () => {
            const mockUser = {
                tag: 'mockUserTag'
            } as User;
            const mockPermissionsBitField = {
                has: jest.fn(() => true)
            };
            const mockClientMember = {
                permissionsIn: jest.fn(() => (mockPermissionsBitField)),
            };
            const mockGuildMembers = {
                me: mockClientMember
            } as unknown as GuildMemberManager;
            const mockGuild = {
                name: 'mockGuildName',
                members: mockGuildMembers
            } as Guild;
            const mockGuildMember = {
                user: mockUser,
                guild: mockGuild
            } as GuildMember;
            const mockChannel = {
                name: 'mockChannelName',
                send: jest.fn(() => Promise.reject())
            } as unknown as GuildTextBasedChannel;
            const scoreSystem = new ScoreSystem();

            await expect(scoreSystem['sendNextLevelMessage'](mockGuildMember, mockChannel, 1)).rejects.toThrow();

            expect(mockChannel.send).toHaveBeenCalled();
            expect(log.error).toHaveBeenCalled();
        });
    });
});
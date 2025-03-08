// File Version: 0.0.3

import * as fs from 'fs';
import CommandHandler from './CommandHandler';
import SlashCommand from '../classes/SlashCommand';
import { client } from '..';
import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes, SlashCommandBuilder } from 'discord.js';
import path from 'path';
import { log } from '../classes/LogSystem';
import AdminCommand, { AdminCommandData } from '../classes/AdminCommand';

jest.mock('fs');
jest.mock('path');
jest.mock('../classes/SlashCommand', () => ({
    __esModule: true,
    default: class SlashCommand {
        constructor(public data: unknown, public execute: unknown) { }
    },
}));
jest.mock('../classes/AdminCommand', () => ({
    __esModule: true,
    default: class AdminCommand {
        constructor(public data: unknown, public execute: unknown) { }
    },
}));
jest.mock('../', () => ({
    client: {
        commands: new Map(),
        adminCommands: new Map(),
    },
}));
jest.mock('discord.js', () => ({
    REST: jest.fn(),
    Routes: {
        applicationCommands: jest.fn(),
    },
}));

describe('CommandHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        client.commands.clear();
        client.adminCommands.clear();
    });

    describe('constructor', () => {
        it('should set shouldDeploy based on the parameter', () => {
            let commandHandler = new CommandHandler(true);
            expect(commandHandler.shouldDeploy).toBe(true);

            commandHandler = new CommandHandler(false);
            expect(commandHandler.shouldDeploy).toBe(false);
        });

        it('should set shouldDeploy based on the environment variable', () => {
            process.env.DEPLOY = 'false';
            let commandHandler = new CommandHandler();
            expect(commandHandler.shouldDeploy).toBe(false);

            process.env.DEPLOY = 'true';
            commandHandler = new CommandHandler();
            expect(commandHandler.shouldDeploy).toBe(true);
        });
    });

    describe('handleAllCommands', () => {
        it.todo('should handle all commands syncronously');
        it.todo('should handle all commands asynchronously');
    });

    describe('handleCommands', () => {
        it('should handle valid commands in the commands directory', async () => {
            // Mock estrutura de diretórios e arquivos
            (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                if (p.endsWith('commands')) return ['command1', 'command2'];
                if (p.endsWith('command1') || p.endsWith('command2')) return ['index.ts'];
                return [];
            });

            const mockCommand1Data = { name: 'mockCommand1', toJSON() { return this; } } as unknown as SlashCommandBuilder;
            const mockCommand2Data = { name: 'mockCommand2', toJSON() { return this; } } as unknown as SlashCommandBuilder;
            class MockCommand1 extends SlashCommand {
                public static readonly data = mockCommand1Data;
                public execute = jest.fn(async () => { });
            }
            class MockCommand2 extends SlashCommand {
                public static readonly data = mockCommand2Data;
                public execute = jest.fn(async () => { });
            }

            (path.join as jest.Mock).mockImplementation((...args) => {
                if (args.join('/').endsWith('command1/index.ts')) {
                    return '/mock/commands/command1/index.ts';
                } else if (args.join('/').endsWith('command2/index.ts')) {
                    return '/mock/commands/command2/index.ts';
                }
                return args.join('/');
            });

            jest.doMock(
                '/mock/commands/command1/index.ts',
                () => ({ __esModule: true, default: MockCommand1 }),
                { virtual: true }
            );
            jest.doMock(
                '/mock/commands/command2/index.ts',
                () => ({ __esModule: true, default: MockCommand2 }),
                { virtual: true }
            );

            let ch = new CommandHandler(false);
            ch.deployCommands = jest.fn(async () => { });

            await ch.handleCommands();

            expect(client.commands.size).toBe(2);
            expect(client.commands.get('mockCommand1')).toBe(MockCommand1);
            expect(client.commands.get('mockCommand2')).toBe(MockCommand2);
            expect(ch.deployCommands).not.toHaveBeenCalled();

            ch = new CommandHandler(true);
            ch.deployCommands = jest.fn(async () => { });

            await ch.handleCommands();

            expect(ch.deployCommands).toHaveBeenNthCalledWith(1, [mockCommand1Data, mockCommand2Data]);
            jest.dontMock('/mock/commands/command1/index.ts');
            jest.dontMock('/mock/commands/command2/index.ts');
        });

        describe('should skip invalid commands', () => {
            let commandHandler: CommandHandler;

            beforeEach(() => {
                commandHandler = new CommandHandler(true);
                commandHandler.deployCommands = jest.fn(async () => { });
            });

            it('should skip non SlashCommand commands', async () => {
                (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                    if (p.endsWith('commands')) return ['invalidCommand'];
                    if (p.endsWith('invalidCommand')) return ['index.ts'];
                });

                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('invalidCommand/index.ts')) {
                        return '/mock/commands/invalidCommand/index.ts';
                    }
                    return args.join('/');
                });

                jest.doMock('/mock/commands/invalidCommand/index.ts', () => ({
                    __esModule: true,
                    default: {},
                }), { virtual: true });

                client.commands.set = jest.fn();

                await commandHandler.handleCommands();

                expect(client.commands.size).toBe(0);
                expect(log.warn).toHaveBeenCalled();
                expect(client.commands.set).not.toHaveBeenCalled();
                jest.dontMock('/mock/commands/invalidCommand/index.ts');
            });

            it('should skip commands without index file', async () => {
                (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                    if (p.endsWith('commands')) return ['command1'];
                    if (p.endsWith('command1')) return ['indexx.ts']; // invalid file name
                });

                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('command1/index.ts')) {
                        return '/mock/commands/command1/index.ts';
                    }
                    return args.join('/');
                });

                await commandHandler.handleCommands();

                expect(client.commands.size).toBe(0);
                expect(log.warn).toHaveBeenCalled();
            });

            it('should skip commands that the importCommandInPath fails', async () => {
                (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                    if (p.endsWith('commands')) return ['invalidCommand'];
                    if (p.endsWith('invalidCommand')) return ['index.ts'];
                });

                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('invalidCommand/index.ts')) {
                        return '/mock/commands/invalidCommand/index.ts';
                    }
                    return args.join('/');
                });

                client.commands.set = jest.fn();
                const commandHandler = new CommandHandler();
                commandHandler.deployCommands = jest.fn(async () => { });
                commandHandler['importCommandInPath'] = jest.fn(async () => { throw new Error('Test Error'); });

                await commandHandler.handleCommands();

                expect(log.error).toHaveBeenCalled();
                expect(client.commands.size).toBe(0);
                expect(client.commands.set).not.toHaveBeenCalled();
            });

            it('should skip commands that the import fails', async () => {
                (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                    if (p.endsWith('commands')) return ['invalidCommand'];
                    if (p.endsWith('invalidCommand')) return ['index.ts'];
                });

                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('invalidCommand/index.ts')) {
                        return '/mock/commands/invalidCommand/index.ts';
                    }
                    return args.join('/');
                });

                client.commands.set = jest.fn();
                const commandHandler = new CommandHandler();
                commandHandler.deployCommands = jest.fn(async () => { });

                await commandHandler.handleCommands();

                expect(log.error).toHaveBeenCalled();
                expect(client.commands.size).toBe(0);
                expect(client.commands.set).not.toHaveBeenCalled();
            });

            it('should throw an error if the deployCommands fails', async () => {
                (fs.readdirSync as jest.Mock).mockImplementation(() => []);

                const ch = new CommandHandler(true);

                ch.deployCommands = jest.fn(async () => { throw new Error('Test Error'); });

                await expect(ch.handleCommands()).rejects.toThrow();

                expect(log.error).toHaveBeenCalled();
                expect(ch.deployCommands).toHaveBeenCalled();
            });
        });
    });

    describe('handleAdminCommands', () => {

        beforeEach(() => {
            (path.join as jest.Mock).mockImplementation((...args) => {
                if (args.join('/').endsWith('admin-commands')) {
                    return '/mock/admin-commands';
                }
                return args.join('/');
            });
        });

        it('should handle valid admin commands in the admin-commands directory', async () => {
            (fs.readdirSync as jest.Mock).mockReturnValue(['adminCommand1.ts', 'adminCommand2.ts']);

            const adminCommandData1 = { name: 'mockAdminCommand1' };
            const adminCommandData2 = { name: 'mockAdminCommand2' };
            class MockAdminCommand1 extends AdminCommand {
                public static readonly data = adminCommandData1;
                public execute = jest.fn(async () => { });
            };
            class MockAdminCommand2 extends AdminCommand {
                public static readonly data = adminCommandData2;
                public execute = jest.fn(async () => { });
            };

            jest.doMock('/mock/admin-commands/adminCommand1.ts', () => ({
                __esModule: true,
                default: MockAdminCommand1,
            }), { virtual: true });
            jest.doMock('/mock/admin-commands/adminCommand2.ts', () => ({
                __esModule: true,
                default: MockAdminCommand2,
            }), { virtual: true });

            const commandHandler = new CommandHandler();

            await commandHandler.handleAdminCommands();

            expect(client.adminCommands.size).toBe(2);
            expect(client.adminCommands.get('mockAdminCommand1')).toBe(MockAdminCommand1);
            expect(client.adminCommands.get('mockAdminCommand2')).toBe(MockAdminCommand2);
            jest.dontMock('/mock/admin-commands/adminCommand1.ts');
            jest.dontMock('/mock/admin-commands/adminCommand2.ts');
        });

        it('should skip invalid admin commands', async () => {
            (fs.readdirSync as jest.Mock).mockReturnValue(['invalidAdminCommand.ts']);
            jest.doMock('/mock/admin-commands/invalidAdminCommand.ts', () => ({
                default: {},
            }), { virtual: true });

            const commandHandler = new CommandHandler();

            await commandHandler.handleAdminCommands();

            expect(client.adminCommands.size).toBe(0);
            jest.dontMock('/mock/admin-commands/invalidAdminCommand.ts');
        });

        it('should skip and log if the importCommandInPath fails', async () => {
            (fs.readdirSync as jest.Mock).mockReturnValue(['adminCommand.ts']);
            const commandHandler = new CommandHandler();
            commandHandler['importCommandInPath'] = jest.fn(async () => { throw new Error('Test Error'); });

            await commandHandler.handleAdminCommands();

            expect(log.error).toHaveBeenCalled();
            expect(client.adminCommands.size).toBe(0);
        });
    });

    describe('deployCommands', () => {
        it('should deploy commands to Discord API', async () => {
            jest.resetModules();

            const restMock = {
                put: jest.fn(async () => [{ name: 'testCommand' }]),
                setToken: jest.fn().mockReturnThis(),
            };

            (REST as unknown as jest.Mock).mockImplementation(() => restMock);
            (Routes.applicationCommands as jest.Mock).mockReturnValue('mockRoute');


            const commandsToDeploy = [{ name: 'testCommand' } as RESTPostAPIChatInputApplicationCommandsJSONBody];

            await new CommandHandler().deployCommands(commandsToDeploy);

            expect(restMock.put).toHaveBeenCalledWith('mockRoute', { body: [{ name: 'testCommand' }] });

            (Routes.applicationCommands as jest.Mock).mockRestore();
            (restMock.put as jest.Mock).mockRestore();
        });

        it('should throw an error if an error occurs while deploying commands', async () => {
            const restMock = {
                put: jest.fn().mockRejectedValue(new Error('Test Error')),
                setToken: jest.fn().mockReturnThis(),
            };

            (REST as unknown as jest.Mock).mockImplementation(() => restMock);

            const commandHandler = new CommandHandler();

            await expect(commandHandler.deployCommands([])).rejects.toThrow();
            expect(log.error).toHaveBeenCalled();
        });
    });

    describe('importCommandInPath', () => {
        it('should import slash command in the path', async () => {
            const mockCommandData = { name: 'mockCommand' } as SlashCommandBuilder;

            class MockCommand extends SlashCommand {
                public static readonly data = mockCommandData;
                public execute = jest.fn(async () => { });
            };

            jest.resetModules();
            jest.doMock(
                '/mock/commands/command1/index.ts',
                () => ({
                    __esModule: true,
                    default: MockCommand,
                }),
                { virtual: true }
            );

            const commandHandler = new CommandHandler();

            const Command = await commandHandler['importCommandInPath']('/mock/commands/command1/index.ts', SlashCommand);

            expect(Command).toBe(MockCommand);
            expect(Command.prototype).toBeInstanceOf(SlashCommand);
        });
        it('should import admin command in path', async () => {
            const mockCommandData = { name: 'mockAdminCommand' } as AdminCommandData;

            class MockAdminCommand extends AdminCommand {
                public static readonly data = mockCommandData;
                public execute = jest.fn(async () => { });
            };

            jest.resetModules();
            jest.doMock(
                '/mock/admin-commands/adminCommand1.ts',
                () => ({
                    __esModule: true,
                    default: MockAdminCommand,
                }),
                { virtual: true }
            );

            const commandHandler = new CommandHandler();


            const Command = await commandHandler['importCommandInPath']('/mock/admin-commands/adminCommand1.ts', AdminCommand);

            expect(Command).toBe(MockAdminCommand);
            expect(Command.prototype).toBeInstanceOf(AdminCommand);
        });
        it('should throw an error if the command is not an subclass of SlashCommand', async () => {
            jest.resetModules();
            jest.doMock(
                '/mock/commands/command1/index.ts',
                () => Date,
                { virtual: true }
            );

            const commandHandler = new CommandHandler();

            await expect(commandHandler['importCommandInPath']('/mock/commands/command1/index.ts', SlashCommand)).rejects.toThrow('The command is not a subclass of SlashCommand');
            expect(log.warn).toHaveBeenCalledWith('O comando em (#(/mock/commands/command1/index.ts)#) não é uma subclasse de #(SlashCommand)#.');

            jest.dontMock('/mock/commands/command1/index.ts');
        });
        it.todo('should throw an error if the command does not have a default export');
        it.todo('should throw an error if the command is not an subclass of AdminCommand');
        it.todo('should throw an error if the command is not a class');
        it.todo('should throw an error if the imported command is falsy');
        it.todo('should throw an error if the imported command is not an object');
    });
});

import * as fs from 'fs';
import CommandHandler from './CommandHandler';
import SlashCommand from './classes/Command';
import { client } from '.';
import { RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from 'discord.js';
import path from 'path';
import { log } from './classes/LogSystem';
import AdminCommand from './classes/AdminCommand';

jest.mock('fs');
jest.mock('path');
jest.mock('./classes/Command', () => ({
    __esModule: true,
    default: class SlashCommand {
        constructor(public data: unknown, public execute: unknown) { }
    },
}));
jest.mock('./classes/AdminCommand', () => ({
    __esModule: true,
    default: class AdminCommand {
        constructor(public data: unknown, public execute: unknown) { }
    },
}));
const restMock = {
    put: jest.fn().mockResolvedValue([{ name: 'testCommand' }]),
    setToken: jest.fn().mockReturnThis(),
};
jest.mock('discord.js', () => ({
    REST: jest.fn().mockImplementation(() => restMock),
    Routes: {
        applicationCommands: jest.fn(() => 'mockRoute'),
    },
}));
jest.mock('./', () => ({
    client: {
        commands: new Map(),
        adminCommands: new Map(),
    },
}));
jest.mock('./classes/LogSystem', () => ({
    log: {
        loading: jest.fn(),
        success: jest.fn(),
        successh: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
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

    describe('handleCommands', () => {
        it('should handle valid commands in the commands directory', async () => {
            // Mock estrutura de diretórios e arquivos
            (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                if (p.endsWith('commands')) return ['category1'];
                if (p.endsWith('category1')) return [{ name: 'command1', isDirectory: () => true }];
                if (p.endsWith('command1')) return ['index.ts'];
                return [];
            });

            const mockCommandData = { name: 'mockCommand' };
            const mockCommand = new SlashCommand({ ...mockCommandData, toJSON: () => mockCommandData } as SlashCommandBuilder, async () => { });

            (path.join as jest.Mock).mockImplementation((...args) => {
                if (args.join('/').endsWith('command1/index.ts')) {
                    return '/mock/commands/category1/command1/index.ts';
                }
                return args.join('/');
            });

            jest.mock('/mock/commands/category1/command1/index.ts', () => (mockCommand), { virtual: true });

            let ch = new CommandHandler(false);
            ch.deployCommands = jest.fn();

            await ch.handleCommands();

            expect(client.commands.size).toBe(1);
            expect(client.commands.get('mockCommand')).toBe(mockCommand);
            expect(ch.deployCommands).not.toHaveBeenCalled();

            ch = new CommandHandler(true);
            ch.deployCommands = jest.fn();

            await ch.handleCommands();

            expect(ch.deployCommands).toHaveBeenNthCalledWith(1, [mockCommandData]);
        });

        describe('should skip invalid commands', () => {
            let commandHandler: CommandHandler;

            beforeEach(() => {
                commandHandler = new CommandHandler(true);
                commandHandler.deployCommands = jest.fn();
            });

            it('should skip non SlashCommand commands', async () => {
                (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                    if (p.endsWith('commands')) return ['category1'];
                    if (p.endsWith('category1')) return [{ name: 'invalidCommand', isDirectory: () => true }];
                    if (p.endsWith('invalidCommand')) return ['index.ts'];
                });

                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('invalidCommand/index.ts')) {
                        return '/mock/commands/category1/invalidCommand/index.ts';
                    }
                    return args.join('/');
                });

                jest.mock('/mock/commands/category1/invalidCommand/index.ts', () => ({
                    __esModule: true,
                    default: {},
                }), { virtual: true });

                await commandHandler.handleCommands();

                expect(client.commands.size).toBe(0);
                expect(log.warn).toHaveBeenCalled();
            });

            it('should skip commands without index file', async () => {
                (fs.readdirSync as jest.Mock).mockImplementation((p: string) => {
                    if (p.endsWith('commands')) return ['category1'];
                    if (p.endsWith('category1')) return [{ name: 'command1', isDirectory: () => true }];
                    if (p.endsWith('command1')) return ['indexx.ts']; // invalid file name
                });

                await commandHandler.handleCommands();

                expect(client.commands.size).toBe(0);
                expect(log.warn).toHaveBeenCalled();
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
            (fs.readdirSync as jest.Mock).mockReturnValue(['adminCommand.ts']);

            const adminCommandData = { name: 'mockAdminCommand' };
            const mockAdminCommand = new AdminCommand(adminCommandData, async () => { });

            jest.mock('/mock/admin-commands/adminCommand.ts', () => ({
                __esModule: true,
                default: mockAdminCommand,
            }), { virtual: true });

            const commandHandler = new CommandHandler();

            await commandHandler.handleAdminCommands();

            expect(client.adminCommands.size).toBe(1);
            expect(client.adminCommands.get('mockAdminCommand')).toBe(mockAdminCommand);
        });

        it('should skip invalid admin commands', async () => {
            (fs.readdirSync as jest.Mock).mockReturnValue(['invalidAdminCommand.ts']);
            jest.mock('/mock/admin-commands/invalidAdminCommand.ts', () => ({
                default: {},
            }), { virtual: true });

            const commandHandler = new CommandHandler();

            await commandHandler.handleAdminCommands();

            expect(client.adminCommands.size).toBe(0);
        });
    });

    describe('deployCommands', () => {
        it('should deploy commands to Discord API', async () => {
            const commandsToDeploy = [{ name: 'testCommand' } as RESTPostAPIChatInputApplicationCommandsJSONBody];

            await new CommandHandler().deployCommands(commandsToDeploy);

            expect(restMock.put).toHaveBeenCalledWith('mockRoute', { body: [{ name: 'testCommand' }] });
        });
    });
});

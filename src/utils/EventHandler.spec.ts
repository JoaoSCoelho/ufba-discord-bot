import * as path from 'path';
import * as fs from 'fs';
import ClientEvent from '../classes/ClientEvent';
import EventHandler from './EventHandler';
import { client } from '..';
import { ClientEvents } from 'discord.js';
import { log } from '../classes/LogSystem';

jest.mock('path');
jest.mock('fs');
jest.mock('../classes/LogSystem', () => ({
    log: {
        loading: jest.fn(),
        success: jest.fn(),
        successh: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('../classes/ClientEvent', () => ({
    __esModule: true,
    default: class ClientEvent {
        constructor(public eventName: string, public listener: (...args: unknown[]) => unknown, public once?: boolean) { }
    }
}));
jest.mock('..', () => ({
    client: {
        on: jest.fn(),
        once: jest.fn()
    }
}));

describe('EventHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });


    describe('handleAllEvents', () => {
        describe('should handle valid events in the events directory', () => {
            it('one event', async () => {
                // Mock estrutura de diretórios e arquivos
                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('events/validEvent1.ts')) {
                        return '/mock/events/validEvent1.ts';
                    }
                    return args.join('/');
                });
                (fs.readdirSync as jest.Mock).mockReturnValue(['validEvent1.ts']);
                jest.mock('/mock/events/validEvent1.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('validEvent1' as keyof ClientEvents, () => { }),
                }), { virtual: true });

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();


                expect(client.on).toHaveBeenNthCalledWith(1, 'validEvent1', expect.any(Function));
                expect(log.successh).toHaveBeenCalledWith('#(1)# eventos cadastrados com sucesso');
            });

            it('multiple events', async () => {
                // Mock estrutura de diretórios e arquivos
                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('events/vEvent1.ts')) {
                        return '/mock/events/vEvent1.ts';
                    }
                    if (args.join('/').endsWith('events/vEvent2.ts')) {
                        return '/mock/events/vEvent2.ts';
                    }
                    return args.join('/');

                });
                (fs.readdirSync as jest.Mock).mockReturnValue(['vEvent1.ts', 'vEvent2.ts']);
                jest.mock('/mock/events/vEvent1.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('vEvent1' as keyof ClientEvents, () => { }),
                }), { virtual: true });
                jest.mock('/mock/events/vEvent2.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('vEvent2' as keyof ClientEvents, () => { }, true),
                }), { virtual: true });

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();


                expect(client.on).toHaveBeenNthCalledWith(1, 'vEvent1', expect.any(Function));
                expect(client.once).toHaveBeenNthCalledWith(1, 'vEvent2', expect.any(Function));
                expect(log.successh).toHaveBeenCalledWith('#(2)# eventos cadastrados com sucesso');
            });
        });

        describe('should skip invalid events in the events directory', () => {
            it('1 valid and 1 invalid events', async () => {
                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('events/invalidEvent1.ts')) {
                        return '/mock/events/invalidEvent1.ts';
                    }
                    if (args.join('/').endsWith('events/invalidEvent2.ts')) {
                        return '/mock/events/invalidEvent2.ts';
                    }
                    return args.join('/');
                });
                (fs.readdirSync as jest.Mock).mockReturnValue(['invalidEvent1.ts', 'invalidEvent2.ts']);
                jest.mock('/mock/events/invalidEvent1.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('invalidEvent1' as keyof ClientEvents, () => { }),
                }), { virtual: true });

                jest.mock('/mock/events/invalidEvent2.ts', () => ({
                    default: {},
                }), { virtual: true });

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();


                expect(client.on).toHaveBeenCalledWith('invalidEvent1', expect.any(Function));
                expect(client.once).not.toHaveBeenCalled();
                expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('não é uma instância de #(ClientEvent)#.'));
                expect(log.successh).toHaveBeenCalledWith('#(1)# eventos cadastrados com sucesso');
            });
        });

    });
});
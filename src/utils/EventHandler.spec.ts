// File Version: 0.0.1

import * as path from 'path';
import * as fs from 'fs';
import ClientEvent from '../classes/ClientEvent';
import EventHandler from './EventHandler';
import { client } from '..';
import { ClientEvents } from 'discord.js';
import { log } from '../classes/LogSystem';

jest.mock('path');
jest.mock('fs');
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
                jest.doMock('/mock/events/validEvent1.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('validEvent1' as keyof ClientEvents, () => { }),
                }), { virtual: true });

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();


                expect(client.on).toHaveBeenNthCalledWith(1, 'validEvent1', expect.any(Function));
                expect(log.successh).toHaveBeenCalledWith('#(1)# eventos cadastrados com sucesso.');

                jest.dontMock('/mock/events/validEvent1.ts');
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
                jest.doMock('/mock/events/vEvent1.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('vEvent1' as keyof ClientEvents, () => { }),
                }), { virtual: true });
                jest.doMock('/mock/events/vEvent2.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('vEvent2' as keyof ClientEvents, () => { }, true),
                }), { virtual: true });

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();


                expect(client.on).toHaveBeenNthCalledWith(1, 'vEvent1', expect.any(Function));
                expect(client.once).toHaveBeenNthCalledWith(1, 'vEvent2', expect.any(Function));
                expect(log.successh).toHaveBeenCalledWith('#(2)# eventos cadastrados com sucesso.');

                jest.dontMock('/mock/events/vEvent1.ts');
                jest.dontMock('/mock/events/vEvent2.ts');
            });
        });

        describe('should skip invalid events in the events directory', () => {
            it('1 valid and 1 invalid events by event is not a instance of ClientEvent', async () => {
                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('events/validEvent1.ts')) {
                        return '/mock/events/validEvent1.ts';
                    }
                    if (args.join('/').endsWith('events/invalidEvent2.ts')) {
                        return '/mock/events/invalidEvent2.ts';
                    }
                    return args.join('/');
                });
                (fs.readdirSync as jest.Mock).mockReturnValue(['validEvent1.ts', 'invalidEvent2.ts']);
                jest.doMock('/mock/events/validEvent1.ts', () => ({
                    __esModule: true,
                    default: new ClientEvent('validEvent1' as keyof ClientEvents, () => { }),
                }), { virtual: true });

                jest.doMock('/mock/events/invalidEvent2.ts', () => ({
                    __esModule: true,
                    default: {},
                }), { virtual: true });

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();


                expect(client.on).toHaveBeenCalledWith('validEvent1', expect.any(Function));
                expect(client.once).not.toHaveBeenCalled();
                expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('não é uma instância de #(ClientEvent)#.'));
                expect(log.successh).toHaveBeenCalledWith('#(1)# eventos cadastrados com sucesso.');

                jest.dontMock('/mock/events/validEvent1.ts');
                jest.dontMock('/mock/events/invalidEvent2.ts');
            });

            it('invalid event by not having a default export', async () => {
                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('events/invalidEvent.ts')) {
                        return '/mock/events/invalidEvent.ts';
                    }
                    return args.join('/');
                });
                (fs.readdirSync as jest.Mock).mockReturnValue(['invalidEvent.ts']);
                jest.doMock('/mock/events/invalidEvent.ts', () => ({ __esModule: true }), { virtual: true });

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();

                expect(client.on).not.toHaveBeenCalled();
                expect(client.once).not.toHaveBeenCalled();
                expect((log.warn as jest.Mock).mock.calls[0][0]).toContain('não tem exportação padrão.');
                expect(log.successh).toHaveBeenCalledWith('#(0)# eventos cadastrados com sucesso.');

                jest.dontMock('/mock/events/invalidEvent.ts');
            });

            it('invalid event by not found file', async () => {
                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('events/invalidEvent.ts')) {
                        return '/mock/events/invalidEvent.ts';
                    }
                    return args.join('/');
                });
                (fs.readdirSync as jest.Mock).mockReturnValue(['invalidEvent.ts']);

                const eventHandler = new EventHandler();
                await eventHandler.handleAllEvents();

                expect(client.on).not.toHaveBeenCalled();
                expect(client.once).not.toHaveBeenCalled();
                expect((log.error as jest.Mock).mock.calls[0][0]).toContain('Erro ao importar o arquivo do evento em');
                expect(log.successh).toHaveBeenCalledWith('#(0)# eventos cadastrados com sucesso.');
            });

            it('invalid event by unknown error', async () => {
                (path.join as jest.Mock).mockImplementation((...args) => {
                    if (args.join('/').endsWith('events/invalidEvent.ts')) {
                        return '/mock/events/invalidEvent.ts';
                    }
                    return args.join('/');
                });
                (fs.readdirSync as jest.Mock).mockReturnValue(['invalidEvent.ts']);


                const eventHandler = new EventHandler();
                eventHandler['importEventInPath'] = jest.fn().mockRejectedValue(new Error('Unknown error'));

                await eventHandler.handleAllEvents();

                expect(client.on).not.toHaveBeenCalled();
                expect(client.once).not.toHaveBeenCalled();
                expect((log.error as jest.Mock).mock.calls[0][0]).toContain('Erro ao importar o evento em');
                expect(log.successh).toHaveBeenCalledWith('#(0)# eventos cadastrados com sucesso.');
            });
        });

    });
});

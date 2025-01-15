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
    });


    describe('handleAllEvents', () => {
        it('should handle valid events in the events directory', async () => {
            // Mock estrutura de diretórios e arquivos
            (path.join as jest.Mock).mockImplementation((...args) => {
                if (args.join('/').endsWith('events/event1.ts')) {
                    return '/mock/events/event1.ts';
                }
                return args.join('/');
            });
            (fs.readdirSync as jest.Mock).mockReturnValue(['event1.ts']);
            jest.mock('/mock/events/event1.ts', () => ({
                __esModule: true,
                default: new ClientEvent('event1' as keyof ClientEvents, () => { }),
            }), { virtual: true });

            const eventHandler = new EventHandler();
            await eventHandler.handleAllEvents();


            expect(client.on).toHaveBeenNthCalledWith(1, 'event1', expect.any(Function));
            expect(log.successh).toHaveBeenCalledWith('#(1)# eventos cadastrados com sucesso');
        });
    });
});
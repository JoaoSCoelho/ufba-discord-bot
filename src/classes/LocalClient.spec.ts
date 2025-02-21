import { IntentsBitField, Collection } from 'discord.js';
import LocalClient from './LocalClient';
import { log } from './LogSystem';
import ScoreSystem from '../utils/ScoreSystem';

const VIEW_LOGS = process.env.VIEW_LOGS === 'true';

if (VIEW_LOGS) {
    console.log = jest.requireActual('console').log;
    console.error = jest.requireActual('console').error;
    console.warn = jest.requireActual('console').warn;
    console.info = jest.requireActual('console').info;
}

if (!VIEW_LOGS) jest.mock('./LogSystem', () => ({
    log: {
        infoh: jest.fn(),
        loadingh: jest.fn(),
        successh: jest.fn(),
    },
}));
jest.mock('../utils/ScoreSystem', () => ({
    __esModule: true,
    default: class ScoreSystem { }
}));

describe('LocalClient', () => {
    const mockIntents = [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages];

    it('should instantiate with correct properties', () => {
        process.env.BOT_ADMINS = '123,456';
        process.env.PREFIX = '!';

        const client = new LocalClient({ intents: mockIntents });

        expect(client.admins).toEqual(['123', '456']);
        expect(client.commands).toBeInstanceOf(Collection);
        expect(client.adminCommands).toBeInstanceOf(Collection);
        expect(client.prefix).toBe('!');
        expect(client.database).toBeUndefined();
        expect(client.scoreSystem).toBeInstanceOf(ScoreSystem);

        if (!VIEW_LOGS) expect(log.infoh).toHaveBeenCalledWith(
            'Client instanciado com as seguintes intents:',
            '#(Guilds)#, #(GuildMessages)#.'
        );
    });

    it('should use default prefix if not set in environment variables', () => {
        delete process.env.PREFIX;

        const client = new LocalClient({ intents: mockIntents });

        expect(client.prefix).toBe('_');
    });

    it('should split admins correctly based on environment variable', () => {
        process.env.BOT_ADMINS = '789';

        const client = new LocalClient({ intents: mockIntents });

        expect(client.admins).toEqual(['789']);
    });
});

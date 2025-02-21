import { config } from 'dotenv';
import { configEnv } from './configEnv';
import { log } from '../classes/LogSystem';

const VIEW_LOGS = process.env.VIEW_LOGS === 'true';

if (VIEW_LOGS) {
    console.log = jest.requireActual('console').log;
    console.error = jest.requireActual('console').error;
    console.warn = jest.requireActual('console').warn;
    console.info = jest.requireActual('console').info;
}

if (!VIEW_LOGS) jest.mock('../classes/LogSystem', () => ({
    log: {
        loadingh: jest.fn(),
        successh: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('dotenv', () => ({
    config: jest.fn(),
}));

describe('configEnv', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call config() and log.successh() when no error occurs', () => {
        configEnv();
        expect(config).toHaveBeenCalled();
        if (!VIEW_LOGS) expect(log.successh).toHaveBeenCalled();
        if (!VIEW_LOGS) expect(log.error).not.toHaveBeenCalled();
    });

    it('should call log.error() when an error occurs', () => {
        (config as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Test Error');
        });
        configEnv();
        expect(config).toHaveBeenCalled();
        if (!VIEW_LOGS) expect(log.successh).not.toHaveBeenCalled();
        if (!VIEW_LOGS) expect(log.error).toHaveBeenCalled();
    });
});
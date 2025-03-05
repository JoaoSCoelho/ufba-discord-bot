import { config } from 'dotenv';
import { configEnv } from './configEnv';
import { log } from '../classes/LogSystem';


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
        expect(log.successh).toHaveBeenCalled();
        expect(log.error).not.toHaveBeenCalled();
    });

    it('should call log.error() when an error occurs', () => {
        (config as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Test Error');
        });
        configEnv();
        expect(config).toHaveBeenCalled();
        expect(log.successh).not.toHaveBeenCalled();
        expect(log.error).toHaveBeenCalled();
    });
});
// File Version: 0.0.1

import { config } from 'dotenv';
import { log } from '../classes/LogSystem';
import BaseError from '../Errors/BaseError';

/** Sets in the `process.env` the variables writed in file `.env`. */
export function configEnv() {
    try {
        log.loadingh('Setando variáveis de ambiente de #(.env)# para #(process.env)#.');
        config();
        log.successh('Variáveis de ambiente setadas.');
    } catch (error: unknown) {
        if (!BaseError.isHandled(error)) {
            log.error('Erro ao setar variáveis de ambiente de #(.env)# para #(process.env)#.',
                '\n#(Erro)#:', error);
        }
    }
}

// Config by default
configEnv();
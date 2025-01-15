import { config } from 'dotenv';
import { log } from '../classes/LogSystem';

export function configEnv() {
    try {
        log.loadingh('Setando variáveis de ambiente de #(.env)# para #(process.env)#');
        config();
        log.successh('Variáveis de ambiente setadas');
    } catch (error) {
        log.error('Erro ao setar variáveis de ambiente de #(.env)# para #(process.env)#\n',
            '#(Erro)#:', error);
    }
}

// Config by default
configEnv();
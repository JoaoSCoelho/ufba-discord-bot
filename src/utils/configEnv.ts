import { config } from 'dotenv';
import { log } from '../classes/LogSystem';

function configEnv() {
    try {
        log.loadingh('Setando variáveis de ambiente de #(.env)# para #(process.env)#');
        config();
        log.successh('Variáveis de ambiente setadas');
    } catch (error) {
        log.errorh('Erro ao setar variáveis de ambiente de #(.env)# para #(process.env)#\n',
            '#(Erro)#:', error);
    }
}

configEnv();
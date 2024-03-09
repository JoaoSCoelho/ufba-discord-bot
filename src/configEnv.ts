import { config } from 'dotenv';
import { log } from './classes/LogSystem';

log.loadingh('Setando variáveis de ambiente de #(.env)# para #(process.env)#');
config();
log.successh('Variáveis de ambiente setadas');

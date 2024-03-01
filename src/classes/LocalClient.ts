import { Client, ClientOptions, Collection } from 'discord.js';
import Command from './Command';
import Database from '../database/Database';
import AdminCommand from './AdminCommand';
import { log } from '..';

export default class LocalClient extends Client {
    /** `PT`: Array de IDs de usuários Discord que possuem poder de `ADMIN` no bot */
    public admins = process.env.BOT_ADMINS!.split(',');
    public commands = new Collection<string, Command>();
    public adminCommands = new Collection<string, AdminCommand>();
    public database?: Database;
    public prefix: string = process.env.PREFIX || '_';


    constructor(options: ClientOptions) {
        super(options);

        log.successh('Client instanciado');
    }
}
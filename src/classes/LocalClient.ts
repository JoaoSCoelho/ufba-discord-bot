// File Version: 0.0.2

import { Client, ClientOptions, Collection, If, IntentsBitField, Snowflake } from 'discord.js';
import SlashCommand from './SlashCommand';
import Database from '../database/Database';
import AdminCommand from './AdminCommand';
import { log } from './LogSystem';
import ScoreSystem from '../utils/ScoreSystem';

export default class LocalClient<Ready extends boolean = boolean> extends Client<Ready> {
    /** Array of admin Discord IDs that have full access to all bot commands */
    public readonly admins: Snowflake[] = process.env.BOT_ADMINS?.split(',') ?? [];
    public readonly commands = new Collection<string, SlashCommand>();
    public readonly adminCommands = new Collection<string, AdminCommand>();
    public readonly scoreSystem = new ScoreSystem();
    public database: If<Ready, Database, undefined> = undefined as If<Ready, Database, undefined>;
    public prefix: string = process.env.PREFIX || '_';

    constructor(options: ClientOptions) {
        super(options);

        log.infoh('Client instanciado com as seguintes intents:',
            `${(Array.isArray(options.intents) ? options.intents : [options.intents])
                .map((intent) => `#(${typeof intent !== 'number' ? intent : IntentsBitField.Flags[intent]})#`).join(', ')}.`);
    }
}
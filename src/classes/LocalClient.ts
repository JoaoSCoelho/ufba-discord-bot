import { Client, Collection } from 'discord.js';
import Command from './Command';
import Database from '../database/Database';
import AdminCommand from './AdminCommand';

export default class LocalClient extends Client {
    public admins = process.env.BOT_ADMINS!.split(',');
    public commands = new Collection<string, Command>();
    public adminCommands = new Collection<string, AdminCommand>();
    public database?: Database;
    public prefix: string = process.env.PREFIX || '_';
}
import { Client, Collection } from 'discord.js';
import Command from './Command';

export default class LocalClient extends Client {
	commands = new Collection<string, Command>();
}
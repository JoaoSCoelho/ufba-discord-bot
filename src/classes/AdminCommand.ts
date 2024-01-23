import { Message } from 'discord.js';
import LocalClient from './LocalClient';

export interface AdminCommandData {
    name: string;
}

export default class AdminCommand {
    constructor(
		public data: AdminCommandData,
	    public execute: (message: Message, client: LocalClient, params: Record<string, string>, words: string[]) => unknown
    ) {}
}
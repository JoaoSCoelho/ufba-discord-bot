import { Message } from 'discord.js';
import LocalClient from './LocalClient';

export interface AdminCommandData {
    name: string;
}

export default abstract class AdminCommand {
    public static readonly data: AdminCommandData;

    constructor(
        public readonly message: Message,
        public readonly client: LocalClient,
        public readonly params: Record<string, string>,
        public readonly words: string[]
    ) { }

    public abstract execute(): Promise<unknown>;
}
import { CommandInteraction } from 'discord.js';
import LocalClient from './LocalClient';

export default class CommandExecution {
    constructor(
        public interaction: CommandInteraction,
        public client: LocalClient
    ) {}

    run!: () => Promise<unknown>;
}
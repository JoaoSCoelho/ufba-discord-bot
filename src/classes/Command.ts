import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import CommandExecution from './CommandExecution';
import LocalClient from './LocalClient';

export interface CommandDocumentation {
    category?: string,
    howToUse?: string,
    howToUseEmbed?: EmbedBuilder,
    optionsTutorial?: Record<string, string>,
}

export default class Command {
    constructor(
		public data: SlashCommandBuilder,
	    public execute: ((interaction: CommandInteraction, client: LocalClient) => Promise<unknown>) | 
            typeof CommandExecution,
        public documentation?: CommandDocumentation
    ) {}
}
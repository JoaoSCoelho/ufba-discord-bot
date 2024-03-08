import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import LocalClient from './LocalClient';
import commandOptions from '../utils/command-options';

export interface CommandDocumentation {
    howToUse?: string,
    howToUseEmbed?: EmbedBuilder,
    optionsTutorial?: Record<string, string>,
}

export default class Command {
    constructor(
		public data: SlashCommandBuilder,
	    public execute: (interaction: CommandInteraction, client: LocalClient) => unknown,
        public documentation?: CommandDocumentation
    ) {}

    static commandOptions = commandOptions;
}
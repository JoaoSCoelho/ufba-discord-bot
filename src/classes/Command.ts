import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import LocalClient from './LocalClient';
import commandOptions from '../utils/command-options';

export default class Command {
    constructor(
		public data: SlashCommandBuilder,
	    public execute: (interaction: CommandInteraction, client: LocalClient) => unknown
    ) {}

    static commandOptions = commandOptions;
}
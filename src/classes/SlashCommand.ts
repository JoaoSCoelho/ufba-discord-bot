import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import LocalClient from './LocalClient';

export interface CommandDocumentation {
    /** Category of the command */
    category?: string,

    /** How to use the command */
    howToUse?: string,

    /** Embed of how to use the command */
    howToUseEmbed?: EmbedBuilder,

    /** Tutorial of each option */
    optionsTutorial?: Record<string, string>,
}

export default abstract class SlashCommand {
    public static readonly data: SlashCommandBuilder;
    public static readonly documentation?: CommandDocumentation;

    public constructor(
        public readonly interaction: CommandInteraction,
        public readonly client: LocalClient) { }

    public abstract execute(): Promise<unknown>;
}
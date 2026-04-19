import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import BasicFormButtonBuilder from '../ButtonBuilders/BasicFormButtonBuilder';

export default class CleanButtonActionRowBuilder extends ActionRowBuilder<ButtonBuilder> {
    constructor(customId: string, label: string) {
        super();
        this.setComponents(
            new BasicFormButtonBuilder({ customId, label })
                .setStyle(ButtonStyle.Secondary));
    }
}
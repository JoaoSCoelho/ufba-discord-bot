import { ButtonBuilder } from 'discord.js';
import { BaseButtonData } from '../../Form.types';

export default class BasicFormButtonBuilder extends ButtonBuilder {
    constructor(data: BaseButtonData) {
        super();
        this.setCustomId(data.customId);
        this.setLabel(data.label);
        this.setDisabled(!!data.disabled);
    }
}
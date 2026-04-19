import { ButtonStyle } from 'discord.js';
import BasicFormButtonBuilder from './BasicFormButtonBuilder';
import { BaseButtonData } from '../../Form.types';

export default class PrevQuestionButtonBuilder extends BasicFormButtonBuilder {
    constructor(data: BaseButtonData) {
        super(data);
        this.setStyle(ButtonStyle.Secondary);
    }
}
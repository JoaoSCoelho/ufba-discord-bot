import { ButtonStyle } from 'discord.js';
import { BaseButtonData } from '../../Form.types';
import BasicFormButtonBuilder from './BasicFormButtonBuilder';

export default class NextQuestionButtonBuilder extends BasicFormButtonBuilder {
    constructor(data: BaseButtonData) {
        super(data);
        this.setStyle(ButtonStyle.Success);
    }
}
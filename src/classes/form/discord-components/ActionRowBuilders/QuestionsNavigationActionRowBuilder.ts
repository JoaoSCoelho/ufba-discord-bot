import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BaseButtonData } from '../../Form.types';
import BasicFormButtonBuilder from '../ButtonBuilders/BasicFormButtonBuilder';
import PrevQuestionButtonBuilder from '../ButtonBuilders/PrevQuestionButtonBuilder';
import NextQuestionButtonBuilder from '../ButtonBuilders/NextQuestionButtonBuilder';
import FinishFormButtonBuilder from '../ButtonBuilders/FinishFormButtonBuilder';

export default class QuestionsNavigationActionRowBuilder extends ActionRowBuilder<ButtonBuilder> {
    constructor(currentQuestionIndex: number, questionsSize: number, prevQuestionButtonData?: BaseButtonData, nextQuestionButtonData?: BaseButtonData, finishFormButtonData?: BaseButtonData) {
        super();
        const currentQuestionButton = new BasicFormButtonBuilder({
            customId: `current-question-button-${Date.now()}`,
            label: `${currentQuestionIndex + 1}/${questionsSize}`,
            disabled: true,
        }).setStyle(ButtonStyle.Secondary);

        if (prevQuestionButtonData)
            this.addComponents(new PrevQuestionButtonBuilder(prevQuestionButtonData));

        this.addComponents(currentQuestionButton);

        if (nextQuestionButtonData)
            this.addComponents(new NextQuestionButtonBuilder(nextQuestionButtonData));

        if (finishFormButtonData)
            this.addComponents(new FinishFormButtonBuilder(finishFormButtonData));
    }
}
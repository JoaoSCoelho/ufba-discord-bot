import { EventEmitter } from 'node:events';
import { INodeEventEmitter } from '../../utils/INodeEventEmitter';
import { Attachment, ButtonInteraction, Collection, CommandInteraction, Message } from 'discord.js';
import LocalClient from '../LocalClient';
import { BaseButtonDataOption, ComponentInteraction, QuestionType, StringSelectMenuData } from './Form.types';
import { AskerResponse } from './askers/Asker';
import { TurnPartial } from '../../utils/TurnPartial';


/** Allows to create a form in Discord with multiple questions and with validation for each one. 
 * The allowed type of questions are `String`, `StringSelect`, `Integer`, `Boolean` and `Attachments`.
 */
export default class Form extends (EventEmitter as unknown as { new(): INodeEventEmitter }) {
    /** The collection of questions that should be asked. Setted in the constructor. */
    public questions: Collection<string, Question>;

    public constructor(
        /** The name to identify the form, is supposed to be unique and describe from where the form was opened */
        public readonly name: string,
        /** The interaction that opened the form */
        public readonly interaction: CommandInteraction,
        public readonly client: LocalClient<true>,
        /** A list of all the questions that should be asked */
        questions: TurnPartial<Question, 'response'>[]
    ) {
        super();

        this.questions = new Collection(questions.map((question, index) => [
            question.options.name,
            {
                ...question,

                response: question.response ??
                    (question.type === 'Attachments' || question.type === 'StringSelect')
                    ? []
                    : undefined,

                options: {
                    ...question.options,
                    prevQuestionButton: {
                        hidden: index === 0,
                        ...question.options.prevQuestionButton,
                    },
                    nextQuestionButton: {
                        hidden: index === (questions.length - 1),
                        ...question.options.nextQuestionButton,
                    },
                },
            }
        ]));
    }
}
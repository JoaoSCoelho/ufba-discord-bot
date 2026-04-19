import { ButtonInteraction, CacheType, ComponentType, MessageComponentInteraction, StringSelectMenuInteraction } from 'discord.js';
import discordAnsi from '../../../utils/discord-ansi';
import CleanButtonActionRowBuilder from '../discord-components/ActionRowBuilders/CleanButtonActionRowBuilder';
import QuestionsNavigationActionRowBuilder from '../discord-components/ActionRowBuilders/QuestionsNavigationActionRowBuilder';
import StringSelectMenuActionRowBuilder from '../discord-components/ActionRowBuilders/StringSelectMenuActionRowBuilder';
import { BaseButtonDataOption, StringSelectMenuData, StringSelectQuestionOptions } from '../Form.types';
import Asker from './Asker';
import isObject from '../../../utils/isObject';
import { Obj } from '../../../utils/Obj';
import BaseError from '../../../Errors/BaseError';
import { log } from '../../LogSystem';



export default class StringSelectAsker extends Asker<string[]> {
    /** Asks a string select question
     * @param options The options to ask the question
     * @throws BaseError('Don't exists a question with this name: "{options.name}"')
     */
    public async ask<Returns extends string>(options: StringSelectQuestionOptions<Returns>) {
        if (!this.form.questions.get(options.name))
            throw new BaseError(`Don't exists a question with this name: "${options.name}"`);

        // Defining defaults

        /** Add markers to `options.message` to user know if is a required question or no. 
         * Add markdown prefix to display as a title */
        const formattedMessage =
            (options.required ? `## \\* ${options.message}` : `## (opcional) ${options.message}`) +
            (options.infoMessage ? `\n> ${options.infoMessage}` : '') +
            (options.warnMessage ? `\n\`\`\`ansi\n${discordAnsi.red()(options.warnMessage)}\n\`\`\`` : '');

        /** Data of select menu component */
        const select: StringSelectMenuData<Returns> = {
            customId: options.select.customId ?? 'string-select-' + Date.now(),
            placeholder: options.select.placeholder,
            options: options.select.options.map((option) => ({
                ...option,
                default: (this.form.questions.get(options.name)?.response as Returns[] | undefined)?.includes(option.value) ? true : false
            })),
            maxValues: options.select.maxValues ?? 1,
        };

        const cleanButton: BaseButtonDataOption = {
            label: options.cleanButton?.label ?? 'Desmarcar',
            customId: options.cleanButton?.customId ?? `clean-button-${Date.now()}`,
            hidden: options.cleanButton?.hidden ?? (!options.cleanButton)
        };

        const prevQuestionButton: BaseButtonDataOption = {
            customId: options.prevQuestionButton?.customId ?? `prev-question-button-${Date.now()}`,
            label: options.prevQuestionButton?.label ?? 'Anterior',
            hidden: !!options.prevQuestionButton?.hidden
        };

        const nextQuestionButton: BaseButtonDataOption = {
            customId: options.nextQuestionButton?.customId ?? `next-question-button-${Date.now()}`,
            label: options.nextQuestionButton?.label ?? 'Próximo',
            hidden: !!options.nextQuestionButton?.hidden
        };

        const finishFormButton: BaseButtonDataOption = {
            customId: options.finishFormButton?.customId ?? `finish-form-button-${Date.now()}`,
            label: options.finishFormButton?.label ?? 'Finalizar',
            hidden: options.finishFormButton?.hidden ?? false
        };

        const maxIdleTime = options.collectorIdle ?? 30_000;



        // Making the question message and his components

        const questionComponents = [
            new StringSelectMenuActionRowBuilder(select),
            ...(!cleanButton.hidden ? [new CleanButtonActionRowBuilder(cleanButton.customId, cleanButton.label)] : []),
            new QuestionsNavigationActionRowBuilder(
                this.form.currentQuestionIndex ?? 0, this.form.questions.size,
                prevQuestionButton.hidden ? undefined : prevQuestionButton,
                nextQuestionButton.hidden ? undefined : nextQuestionButton,
                finishFormButton.hidden ? undefined : finishFormButton
            ),
        ];


        const question = await this.interaction.editReply({
            message: this.form.questionMessage,
            content: formattedMessage,
            components: questionComponents
        });



        // Creates the question collector (collects any interaction in question components)
        this.form.interactionCollector = question.createMessageComponentCollector({
            filter: (i) => i.user.id === this.interaction.user.id,
            idle: maxIdleTime,
        });


        this.running = true;


        this.form.interactionCollector.on('collect', async (i) => {
            /** Case the user select a value on select menu */
            if (
                i.customId === select.customId &&
                i.componentType === ComponentType.StringSelect
            ) {

                await this.onChange(i, options)
                    .catch((error: unknown) => {
                        if (isObject(error) && (error as Obj).rejectReason)
                            this.emit('error', (error as Obj).rejectReason);
                    });

            }



            /** Case the user click to goBack to prev question or click to advance to next question */
            else if (
                (i.customId === prevQuestionButton.customId || i.customId === nextQuestionButton.customId) &&
                i.componentType === ComponentType.Button
            ) {

                await this.onChangeQuestionButtonClick(
                    i.customId === prevQuestionButton.customId ? 'goBack' : 'advance',
                    i,
                    options)
                    .catch((error: unknown) => {
                        if (isObject(error) && (error as Obj).rejectReason)
                            this.emit('error', (error as Obj).rejectReason);
                    });

            }



            /** Case the user click to clean select menu selected options */
            else if (
                i.customId === cleanButton.customId &&
                i.componentType === ComponentType.Button
            ) {
                await this.onCleanButtonClick(i, options)
                    .catch((error: unknown) => {
                        if (isObject(error) && (error as Obj).rejectReason)
                            this.emit('error', (error as Obj).rejectReason);
                    });
            }


            /** Case the user click to finish the form */
            else if (
                i.customId === finishFormButton.customId &&
                i.componentType === ComponentType.Button
            ) {
                await this.onFinishFormButtonClick(i, options)
                    .catch((error: unknown) => {
                        if (isObject(error) && (error as Obj).rejectReason)
                            this.emit('error', (error as Obj).rejectReason);
                    });
            }

        });

        this.form.interactionCollector.on('end', (_collected, reason) => {
            if (reason === 'time' || reason === 'idle') {
                if (!this.form.finished) this.form.justFinishForm(reason);
                this.emit('error', reason);
                this.running = false;
            }
        });
    }

    async onChange<Returns extends string>(
        i: StringSelectMenuInteraction<CacheType>,
        options: StringSelectQuestionOptions<Returns>
    ) {
        if (i instanceof MessageComponentInteraction && !i.deferred && !i.replied) await i.deferUpdate()
            .catch((error: unknown) => {
                log.error('Erro ao usar #i(StringSelectMenuInteraction<CacheType>)###(deferUpdate())#',
                    `enquanto executava #(defaultOnChange())# para a question "#(${options.name})#"`,
                    `no Form "#(${this.form.name})#",`,
                    `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                    `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                    '\n#(Erro)#:', error,
                    '\n#(StringSelectMenuInteraction)#:', i,
                    '\n#(CommandInteraction)#:', this.interaction
                );
                BaseError.handle(error);
                throw error;
            });



        if (!this.form.questions.get(options.name))
            throw new BaseError(`Don't exists a question with this name: "${options.name}"`);

        /** Filters the input if have `options.onChangeFilter` */
        const filteredInput = await options.onChangeFilter?.bind(this.form)(i);

        if (filteredInput !== undefined) {
            this.form.refreshQuestion({ warnMessage: filteredInput });

            return null;
        }




        /** Saves the user response */
        this.form.questions.get(options.name)!.response = i.values;



        if (options.onResponseUpdate)
            await options.onResponseUpdate.bind(this.form)(this.form.questions.get(options.name)!);

        this.form.emit('responseUpdate', this.form.questions.get(options.name)!);
        this.emit('responseUpdate', i.values);
        this.response = i.values;



        this.form.refreshQuestion();

        return null;
    }

    async onCleanButtonClick<Returns extends string>(
        i: ButtonInteraction<CacheType>,
        options: StringSelectQuestionOptions<Returns>
    ) {
        if (!i.deferred && !i.replied) await i.deferUpdate()
            .catch((error: unknown) => {
                log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                    'enquanto executava #(defaultOnCleanButtonClick())#',
                    `para a question "#(${options.name})#" no Form "#(${this.form.name})#",`,
                    `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                    `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                    '\n#(Erro)#:', error,
                    '\n#(ButtonInteraction)#:', i,
                    '\n#(CommandInteraction)#:', this.interaction
                );
                BaseError.handle(error);
                throw error;
            });



        if (!this.form.questions.get(options.name))
            throw new Error(`Don't exists a question with this name: "${options.name}"`);

        /** Clear the response */
        this.form.questions.get(options.name)!.response = [];




        if (options.onClean) await options.onClean.bind(this.form)(this.form.questions.get(options.name)!);
        if (options.onResponseUpdate) await options.onResponseUpdate.bind(this.form)(this.form.questions.get(options.name)!);

        this.form.emit('responseUpdate', this.form.questions.get(options.name)!);
        this.emit('responseUpdate', [] as []);
        this.response = [] as [];

        this.form.refreshQuestion();

        return [] as [];
    }
}
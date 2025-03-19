import { EventEmitter } from 'node:events';
import { ActionRowBuilder, Attachment, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChannelSelectMenuInteraction, Collection, CollectorFilter, CommandInteraction, ComponentType, InteractionCollector, MappedInteractionTypes, MentionableSelectMenuInteraction, Message, MessageCollector, MessageCollectorOptions, MessageCollectorOptionsParams, MessageComponentInteraction, MessageComponentType, RoleSelectMenuInteraction, SelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextBasedChannel, UserSelectMenuInteraction } from 'discord.js';
import LocalClient from '../LocalClient';
import { Question, QuestionAttachments, QuestionBoolean, QuestionInteger, QuestionString, QuestionStringSelect, QuestionType, BaseButtonData, BaseButtonDataOption, ParamQuestionAttachments, ParamQuestionBoolean, ParamQuestionInteger, ParamQuestionString, ParamQuestionStringSelect, StringSelectMenuData, StringSelectQuestionOptions, ChangeQuestionAction, StringQuestionOptions, IntegerQuestionOptions, BooleanQuestionOptions, AttachmentsQuestionOptions, BaseQuestionOptions } from '../form/Form.types';
import { FormEvents } from '../form/Form.types';
import isObject from '../../utils/isObject';
import discordAnsi from '../../utils/discord-ansi';
import { log } from '../LogSystem';
import { INodeEventEmitter } from '../../utils/INodeEventEmitter';
import BaseError from '../../Errors/BaseError';
import { Obj } from '../../utils/Obj';
import HandledError from '../../Errors/HandledError';




/** Allows to create a form in Discord with multiple questions and with validation for each one. 
 * The allowed type of questions are `String`, `StringSelect`, `Integer`, `Boolean` and `Attachments`.
 */
export default class Form extends (EventEmitter as unknown as { new(): INodeEventEmitter }) {
    // Collectors savers ------------------------

    /** All collectors opened during the form execution */
    private collectors: (InteractionCollector<MappedInteractionTypes[MessageComponentType]> | MessageCollector)[] = [];
    /** Only message collectors opened during the form execution */
    private messageCollectors: MessageCollector[] = [];
    /** Only interaction collector opened during the form execution */
    private interactionCollectors: InteractionCollector<MappedInteractionTypes[MessageComponentType]>[] = [];

    // Questions controller vars
    /** The collection of questions that should be asked. Setted in the constructor. */
    public questions: Collection<string, (QuestionStringSelect | QuestionString | QuestionInteger | QuestionBoolean | QuestionAttachments)>;

    public lastQuestionIndex: number | undefined;
    public currentQuestionIndex: number | undefined;
    public questionMessage: Message | undefined;


    public finished: boolean = false;



    constructor(
        public name: string,
        private interaction: CommandInteraction<CacheType>,
        private client: LocalClient,
        /** A list of all the questions that should be asked */
        questions: (ParamQuestionStringSelect | ParamQuestionString | ParamQuestionInteger | ParamQuestionBoolean | ParamQuestionAttachments)[],
    ) {
        super();

        const DEFAULT_RESPONSES: { [Key in QuestionType]: () => Question<Key>['response'] } = {
            Attachments: () => [],
            Boolean: () => undefined,
            Integer: () => undefined,
            String: () => undefined,
            StringSelect: () => []
        };

        this.questions = new Collection(questions.map((question, index, array) => [question.options.name, {
            ...question,

            response: question.response ?? DEFAULT_RESPONSES[question.type](),

            options: {
                ...question.options,
                prevQuestionButton: {
                    hidden: index === 0,
                    ...question.options.prevQuestionButton,
                },
                nextQuestionButton: {
                    hidden: index === (array.length - 1),
                    ...question.options.nextQuestionButton,
                },
            },
        } as QuestionStringSelect | QuestionString | QuestionInteger | QuestionBoolean | QuestionAttachments]));

    }




    /** Starts the form execution.
     * @param fromIndex The index of the question that the form should start. If not provided, the form will start with the first question.
     */
    public async run(fromIndex?: number) {
        if (!this.interaction.deferred && !this.interaction.replied)
            // Turn the interaction to deferred to Discord understand that the bot is working on it
            await this.interaction.deferReply({ ephemeral: true })
                .catch((error: unknown) => {
                    log.error('Erro ao usar #i(CommandInteraction<CacheType>)###(deferReply())#',
                        `enquanto executava #(run())# no Form "#(${this.name})#",`,
                        `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                        `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                        '\n#(Erro)#:', error,
                        '\n#(CommandInteraction)#:', this.interaction
                    );
                    BaseError.handle(error);

                    this.emit('error', error);
                    throw error;
                });


        if (!this.questions.size) {
            this.finishForm();
            return;
        }



        const questionMessageOptions = {
            content: 'Iniciando formulário...',
            ephemeral: true,
        };

        this.questionMessage = await this.interaction.followUp(questionMessageOptions)
            .catch((error: unknown) => {
                log.error('Erro ao usar #i(CommandInteraction<CacheType>)###(followUp(Options))#',
                    `enquanto executava #(run())# no Form "#(${this.name})#",`,
                    `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                    `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                    '\n#(Erro)#:', error,
                    '\n#(MessageOptions)#:', questionMessageOptions,
                    '\n#(CommandInteraction)#:', this.interaction
                );
                BaseError.handle(error);

                this.emit('error', error);
                throw error;
            });


        /** Starts with the first question */
        this.changeQuestion(fromIndex ?? 0);

    }

    /** Finish the form with status `stopped` */
    public stop() {
        this.justFinishForm('stopped');
    }

    /** Start the asker module for a question.
     * @param question The question that should be asked.
     */
    private callQuestionAsker(question: Question<QuestionType>) {
        // @ts-expect-error - The type of "question" is correct
        this.askers[question.type]?.bind(this)(question.options)
            .catch((error: unknown) => {
                this.emit('error', { error, question });
            });
    }

    /** Refreshes the current question. Generally used when the question is responded incorrectly and the form should to restart the question with some alert to the user.
     * @param byPassOptions `{ warnMessage, infoMessage }` Options to bypass the current question options.
     * @throws HandledError('It is not possible to refresh the question because the current question index is not defined.')
     * @throws HandledError('It is not possible to refresh the question because the current question index does not index any question in the form.')
     */
    public refreshQuestion(byPassOptions?: Partial<Pick<BaseQuestionOptions<boolean, QuestionType>, 'warnMessage' | 'infoMessage'>>) {
        if (typeof this.currentQuestionIndex !== 'number') {
            log.error(`Erro ao tentar atualizar a questão atual no Form "#(${this.name})#".`,
                'O índice da questão atual não está definido.',
                `\n#(Aberto por)#: #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#`,
                `\n#(Servidor)#: #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                '\n#(Form.name)#:', this.name,
                '\n#(Form.currentQuestionIndex)#:', this.currentQuestionIndex,

            );

            const error = new HandledError('It is not possible to refresh the question because the current question index is not defined.');

            this.emit('error', error);
            throw error;
        };


        try {
            /** Stop all collectors so that there is no interference with the refreshed question */
            this.collectors.forEach((collector) => collector.stop());
        } catch (error: unknown) {
            log.error(`Erro ao tentar parar os coletores do Form "#(${this.name})#"`,
                `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#,`,
                'enquanto executava refreshQuestion().',
                '\n#(Erro)#:', error,
                '\n#(Form.collectors)#:', this.collectors,
            );

            BaseError.handle(error);

            this.emit('error', error);
            throw error;
        }


        /** Restarts the question */

        const question = this.questions.at(this.currentQuestionIndex);

        if (!question) {
            log.error(
                `Problema enquanto tentava atualizar a questão atual no Form "#(${this.name})#".`, `O Índice da questão atual não indexa nenhuma questão no form aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                '\n#(Form.currentQuestionIndex)#:', this.currentQuestionIndex,
                '\n#(Form.questions.size)#:', this.questions.size,
            );

            const error = new HandledError('It is not possible to refresh the question because the current question index does not index any question in the form.');

            this.emit('error', error);
            throw error;
        }

        this.callQuestionAsker({ ...question, options: { ...question.options, ...byPassOptions } });
    }



    /** Replaces the current question by another one.
     * @param arg The index of the question that should be asked or the action that should be taken: `goBack` or `advance`.
     * @param byPassOptions `{ warnMessage, infoMessage }` Options to bypass the current question options.
     * @throws HandledError('It is not possible to change the question because the arg does not index any question in the form.')
     * @throws HandledError('It is not possible to change the question because the current question index does not index any question in the form.')
     */
    public changeQuestion(arg: number | ChangeQuestionAction, byPassOptions?: Partial<Pick<BaseQuestionOptions<boolean, QuestionType>, 'warnMessage' | 'infoMessage'>>) {

        // Updates the last and current question index vars

        this.lastQuestionIndex = this.currentQuestionIndex;

        if (typeof arg === 'number') {
            // If the "arg" is an index

            if (arg < 0 || arg >= this.questions.size) {
                log.error(`Erro ao tentar mudar a questão no Form "#(${this.name})#".`,
                    `O argumento dado não indexa nenhuma questão no form aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                    '\n#(Form.currentQuestionIndex)#:', this.currentQuestionIndex,
                    '\n#(Form.questions.size)#:', this.questions.size,
                    '\n#(arg)#:', arg,
                );

                const error = new HandledError('It is not possible to change the question because the arg does not index any question in the form.');

                this.emit('error', error);
                throw error;
            }

            this.currentQuestionIndex = Math.min(Math.max(arg, 0), this.questions.size - 1);
        } else {
            // If the "arg" is an action
            this.currentQuestionIndex = arg === 'goBack' ?
                Math.max((this.lastQuestionIndex ?? 0) - 1, 0) :
                Math.min((this.lastQuestionIndex ?? 0) + 1, this.questions.size - 1);
        }



        try {
            /** Stop all collectors so that there is no interference with the next question */
            this.collectors.forEach((collector) => collector.stop());
        } catch (error: unknown) {
            log.error(`Erro ao tentar parar os coletores do Form "#(${this.name})#"`,
                `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#,`,
                'enquanto executava changeQuestion().',
                '\n#(Erro)#:', error,
                '\n#(Form.collectors)#:', this.collectors,
            );

            BaseError.handle(error);

            this.emit('error', error);
            throw error;
        }



        this.emit('changeQuestion',
            this.currentQuestionIndex,
            this.lastQuestionIndex,
            typeof arg === 'string' ? arg : undefined);



        /** Starts the changed question */

        const newQuestion = this.questions.at(this.currentQuestionIndex);

        if (!newQuestion) {
            log.error(`Problema enquanto tentava mudar a questão no Form "#(${this.name})#".`, `O Índice da questão atual não indexa nenhuma questão no form aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                '\n#(Form.currentQuestionIndex)#:', this.currentQuestionIndex,
                '\n#(Form.questions.size)#:', this.questions.size,
            );

            const error = new HandledError('It is not possible to change the question because the current question index does not index any question in the form.');
            this.emit('error', error);
            throw error;
        }

        this.callQuestionAsker({ ...newQuestion, options: { ...newQuestion.options, ...byPassOptions } });
    }

    /** Stops all running collectors, and finishes the form.
     * @param reason The reason why the form was finished.
     * @emits 'finishForm' The form was finished.
     * @emits 'error' If an error occurred while stopping the collectors.
     */
    private justFinishForm(reason: string) {
        try {
            /** Stop all collectors so that there is no interference on the rest of code execution */
            this.collectors.forEach((collector) => collector.stop());
        } catch (error: unknown) {
            log.error(`Erro ao tentar parar os coletores do Form "#(${this.name})#"`,
                `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#,`,
                `enquanto executava justFinishForm(reason: "${reason}").`,
                '\n#(Erro)#:', error,
                '\n#(Form.collectors)#:', this.collectors,
            );

            BaseError.handle(error);
            this.emit('error', error);
            throw error;
        }

        this.finished = true;

        this.emit('finishForm', reason, this.questions.mapValues((question) => question.response));
    }

    /** Check all questions with checkers and finish the form if there is no error. Also conclude the form in discord UI.
     * @returns The responses of all questions.
     * @emits 'error' If an error occurred while finishing the form.
     */
    public finishForm() {

        // Check all questions with checkers
        Promise.all(this.questions.map(async (question) => {
            /** `string` if some error are found in checking process  */
            // @ts-expect-error - The type of "question" is correct
            const checkerError = await this.checkers[question.type]?.bind(this)(question.options, question.response)
                .catch((error: unknown) => {
                    log.error(`Erro ao tentar checar a questão "#(${question.options.name})# no Form "#(${this.name})#".`,
                        `Aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                        `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                        '\n#(Erro)#:', error,
                        '\n#(Question)#:', question,
                    );
                    BaseError.handle(error);
                    // DO NOT EMIT ERROR HERE! THIS ERROR ARE EMITTED IN THE CATCH BELOW.
                    throw { question, error };
                }) as string | undefined;

            // Returns [questionName, error | undefined]
            return [question.options.name, checkerError] as [string, string | undefined];
        }))
            .then((possiblyErrors: [string, string | undefined][]) => {
                const foundError = possiblyErrors.find(([, reason]) => reason !== undefined) as [string, string] | undefined;

                if (foundError) {
                    // Call the question that have some error again with the error in "warnMessage"
                    const questionWithErrorIndex = this.questions.toJSON().findIndex((question) => question.options.name === foundError[0]);

                    return this.changeQuestion(questionWithErrorIndex, { warnMessage: foundError[1] });
                }

                this.justFinishForm('concluded');

                const questionMessageOptions = {
                    message: this.questionMessage,
                    content: '✅ Formulário concluído!',
                    embeds: [],
                    components: [],
                };

                this.interaction.editReply(questionMessageOptions)
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(CommandInteraction<CacheType>)###(editReply(Message))#',
                            `enquanto finalizava o Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(MessageOptions)#:', questionMessageOptions,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        this.emit('error', error);
                    });

            })
            .catch((error: unknown) => {
                if (!BaseError.isHandled(error)) {
                    log.error('Erro ao rodar checkers no Form "#(${this.name})#".',
                        `Aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                        `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                        '\n#(Erro)#:', error,
                    );

                    BaseError.handle(error);
                }
                this.emit('error', error);
            });




        return this.questions.mapValues((question) => question.response);
    }





    public askers = {
        async StringSelect<Returns extends string, Req extends boolean>(
            this: Form,
            options: StringSelectQuestionOptions<Req, Returns>
        ) {
            if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);



            type Returned = Req extends true ? Returns[] : (Returns[] | [])


            // Defining defaults

            /** Add markers to `options.message` to user know if is a required question or no. Add markdown prefix to display as a title */
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
                    default: (this.questions.get(options.name)?.response as Returns[] | undefined)?.includes(option.value) ? true : false
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



            const onChange: OmitThisParameter<Required<typeof options>['onChange']> =
                options.onChange?.bind(this) ??
                defaultOnChange.bind(this) as OmitThisParameter<Required<typeof options>['onChange']>;

            const onCleanButtonClick: OmitThisParameter<Required<typeof options>['onCleanButtonClick']> =
                options.onCleanButtonClick?.bind(this) ??
                defaultOnCleanButtonClick.bind(this);

            const onChangeQuestionButtonClick: OmitThisParameter<Required<typeof options>['onChangeQuestionButtonClick']> =
                options.onChangeQuestionButtonClick?.bind(this) ??
                defaultOnChangeQuestionButtonClick.bind(this);

            const onFinishFormButtonClick: OmitThisParameter<Required<typeof options>['onFinishFormButtonClick']> =
                options.onFinishFormButtonClick?.bind(this) ??
                defaultOnFinishFormButtonClick.bind(this);




            // Making the question message and his components

            const questionComponents = [
                rowSelectMenuFactory(select),
                ...(!cleanButton.hidden ? [this.rowCleanButtonFactory(cleanButton.customId, cleanButton.label)] : []),
                this.rowNavigateBetweenQuestionsFactory(
                    prevQuestionButton.hidden ? undefined : prevQuestionButton,
                    nextQuestionButton.hidden ? undefined : nextQuestionButton,
                    finishFormButton.hidden ? undefined : finishFormButton
                ),
            ];


            const question = await this.interaction.editReply({
                message: this.questionMessage,
                content: formattedMessage,
                components: questionComponents
            });



            // Creates the question collector (collects any interaction in question components)
            const collector = this.createMessageComponentCollector(question, {
                filter: this.defaultCollectorFilter.bind(this),
                idle: maxIdleTime,
            });




            /** That's promise stay waiting the user interaction to get out the question or end of collector */
            return await new Promise<Returned>(
                (resolve, reject) => {
                    collector.on('collect', async (i) => {
                        /** Case the user select a value on select menu */
                        if (
                            i.customId === select.customId &&
                            i.componentType === ComponentType.StringSelect
                        ) {

                            await onChange(i)
                                .then((response) => {
                                    if (response !== null) resolve(response as Returned);
                                })
                                .catch((error: unknown) => {
                                    if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                                });

                        }



                        /** Case the user click to goBack to prev question or click to advance to next question */
                        else if (
                            (i.customId === prevQuestionButton.customId || i.customId === nextQuestionButton.customId) &&
                            i.componentType === ComponentType.Button
                        ) {

                            await onChangeQuestionButtonClick(i.customId === prevQuestionButton.customId ? 'goBack' : 'advance', i)
                                .then((response) => {
                                    if (response !== null) resolve(response as Returned);
                                })
                                .catch((error: unknown) => {
                                    if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                                });

                        }



                        /** Case the user click to clean select menu selected options */
                        else if (
                            i.customId === cleanButton.customId &&
                            i.componentType === ComponentType.Button
                        ) {
                            await onCleanButtonClick(i)
                                .then((response) => {
                                    if (response !== null) resolve(response as Returned);
                                })
                                .catch((error: unknown) => {
                                    if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                                });
                        }


                        /** Case the user click to finish the form */
                        else if (
                            i.customId === finishFormButton.customId &&
                            i.componentType === ComponentType.Button
                        ) {
                            await onFinishFormButtonClick(i)
                                .then((response) => {
                                    if (response !== null) resolve(response as Returned);
                                })
                                .catch((error: unknown) => {
                                    if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                                });
                        }

                    });

                    collector.on('end', (_collected, reason) => {
                        if (reason === 'time' || reason === 'idle') {
                            if (!this.finished) this.justFinishForm(reason);
                            reject(reason);
                        }
                    });

                }
            );




            /** Is executed when don't have a `option.onChange`  */
            async function defaultOnChange(
                this: Form,
                i: StringSelectMenuInteraction<CacheType>,
            ) {
                if (i instanceof MessageComponentInteraction && !i.deferred && !i.replied) await i.deferUpdate()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(StringSelectMenuInteraction<CacheType>)###(deferUpdate())#',
                            `enquanto executava #(defaultOnChange())# para a question "#(${options.name})#"`,
                            `no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(StringSelectMenuInteraction)#:', i,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });



                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                /** Filters the input if have `options.onChangeFilter` */
                const filteredInput = await options.onChangeFilter?.bind(this)(i);

                if (typeof filteredInput !== 'undefined') {
                    this.refreshQuestion({ warnMessage: filteredInput });

                    return null;
                }




                /** Saves the user response */
                this.questions.get(options.name)!.response = i.values;



                if (options.onResponseUpdate)
                    await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);





                this.refreshQuestion();

                return null;
            }

            /** Is executed when don't have a `option.onCleanButtonClick`  */
            async function defaultOnCleanButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>,
            ) {
                if (!i.deferred && !i.replied) await i.deferUpdate()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                            'enquanto executava #(defaultOnCleanButtonClick())#',
                            `para a question "#(${options.name})#" no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(ButtonInteraction)#:', i,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });



                if (!this.questions.get(options.name))
                    throw new Error(`Don't exists a question with this name: "${options.name}"`);

                /** Saves the user response */
                this.questions.get(options.name)!.response = [];




                if (options.onClean) await options.onClean.bind(this)(this.questions.get(options.name)!);
                if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);


                this.refreshQuestion();

                return [] as [];
            }

            /** Is executed when don't have a `option.onChangeQuestionButtonClick` */
            async function defaultOnChangeQuestionButtonClick(
                this: Form,
                action: ChangeQuestionAction,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnChangeQuestionButtonClickFactory(options).bind(this)(action, i) as Returned;
            }

            /** Is executed when don't have a `option.onFinishFormButtonClick` */
            async function defaultOnFinishFormButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnFinishFormButtonClickFactory(options).bind(this)(i) as Returned;
            }


            /** @returns The select menu action row */
            function rowSelectMenuFactory(select: StringSelectMenuData<Returns>) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setMaxValues(select.maxValues)
                    .setCustomId(select.customId);

                if (select.placeholder)
                    selectMenu.setPlaceholder(select.placeholder);


                /** Add options to select menu */
                selectMenu.addOptions(
                    ...select.options.map(
                        (data) => new StringSelectMenuOptionBuilder(data)
                    )
                );

                return new ActionRowBuilder<SelectMenuBuilder>()
                    .setComponents(selectMenu);
            }
        },

        async String<Req extends boolean>(
            this: Form,
            options: StringQuestionOptions<Req>
        ) {
            if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

            type Returned = Req extends true ? string : (string | undefined)


            // Defining defaults

            const placeholder = options.placeholder ?? '';

            /** Add markers to `options.message` to user know if is a required question or no. Add markdown prefix to display as a title */
            const formattedMessage =
                (options.required ? `## \\* ${options.message}` : `## (opcional) ${options.message}`) +
                (options.infoMessage ? `\n> ${options.infoMessage}` : '') +
                (options.warnMessage ? `\n\`\`\`ansi\n${discordAnsi.red()(options.warnMessage)}\n\`\`\`` : '') +
                `\n\`\`\`ansi\n${(this.questions.get(options.name)! as Question<'String'>).response ?? discordAnsi.gray()(placeholder)}\n\`\`\``;


            const cleanButton: BaseButtonDataOption = {
                label: options.cleanButton?.label ?? 'Limpar',
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

            const maxIdleTime = options.collectorIdle ?? 60_000;

            const minLength = options.minLength ?? 0;
            const maxLength = options.maxLength ?? 8192;


            const lessThanTheMinimumLengthMessage =
                options.lessThanTheMinimumLengthMessage ??
                `Precisa ter um mínimo de ${minLength} caracteres`;

            const greaterThanTheMaximumLengthMessage =
                options.greaterThanTheMaximumLengthMessage ??
                `Precisa ter no máximo ${maxLength} caracteres`;

            const fixMessage =
                options.fixMessage ??
                'Você pode substituir o valor atual enviando outra resposta.';


            const onChange: OmitThisParameter<Required<typeof options>['onChange']> =
                options.onChange?.bind(this) ??
                defaultOnChange.bind(this) as OmitThisParameter<Required<typeof options>['onChange']>;

            const onCleanButtonClick: OmitThisParameter<Required<typeof options>['onCleanButtonClick']> =
                options.onCleanButtonClick?.bind(this) ??
                defaultOnCleanButtonClick.bind(this);

            const onChangeQuestionButtonClick: OmitThisParameter<Required<typeof options>['onChangeQuestionButtonClick']> =
                options.onChangeQuestionButtonClick?.bind(this) ??
                defaultOnChangeQuestionButtonClick.bind(this);

            const onFinishFormButtonClick: OmitThisParameter<Required<typeof options>['onFinishFormButtonClick']> =
                options.onFinishFormButtonClick?.bind(this) ??
                defaultOnFinishFormButtonClick.bind(this);




            // Making the question message and his components

            const questionComponents = [
                ...(!cleanButton.hidden ? [this.rowCleanButtonFactory(cleanButton.customId, cleanButton.label)] : []),
                this.rowNavigateBetweenQuestionsFactory(
                    prevQuestionButton.hidden ? undefined : prevQuestionButton,
                    nextQuestionButton.hidden ? undefined : nextQuestionButton,
                    finishFormButton.hidden ? undefined : finishFormButton
                ),
            ];


            const question = await this.interaction.editReply({
                message: this.questionMessage,
                content: formattedMessage,
                components: questionComponents
            });




            // Creates the question collector (collects any interaction in question components)
            const componentCollector = this.createMessageComponentCollector(question, {
                filter: this.defaultCollectorFilter.bind(this),
            });

            // Creates the question message collector (in current channel) (collects any message sent by the author)
            const messageCollector = this.createMessageCollector(question.channel, {
                filter: (m) => m.author.id === this.interaction.user.id,
                idle: maxIdleTime,
            });



            /** That's promise stay waiting the user interaction to get out the question or end of collector */
            return await new Promise<Returned>((resolve, reject) => {
                messageCollector.on('collect', async (m) => {
                    await onChange(m)
                        .then((response) => {
                            if (response !== null) resolve(response as Returned);
                        })
                        .catch((error: unknown) => {
                            if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                        });
                });

                messageCollector.on('end',
                    (_collected, reason) => componentCollector.stop(reason)
                );





                componentCollector.on('collect', async (i) => {
                    /** Case the user click to goBack to prev question or click to advance to next question */
                    if (
                        (i.customId === prevQuestionButton.customId || i.customId === nextQuestionButton.customId) &&
                        i.componentType === ComponentType.Button
                    ) {

                        await onChangeQuestionButtonClick(i.customId === prevQuestionButton.customId ? 'goBack' : 'advance', i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });

                    }



                    /** Case the user click to clean inputed value */
                    else if (
                        i.customId === cleanButton.customId &&
                        i.componentType === ComponentType.Button
                    ) {
                        await onCleanButtonClick(i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });
                    }


                    /** Case the user click to finish the form */
                    else if (
                        i.customId === finishFormButton.customId &&
                        i.componentType === ComponentType.Button
                    ) {
                        await onFinishFormButtonClick(i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });
                    }
                });


                componentCollector.on('end', (_collected, reason) => {
                    if (reason === 'time' || reason === 'idle') {
                        if (!this.finished) this.justFinishForm(reason);
                        reject(reason);
                    }
                });
            });


            /** Is executed when don't have a `option.onChange`  */
            async function defaultOnChange(this: Form, m: Message) {
                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                // [TASK 3.0] Verify if the bot has permission to delete messages on channel
                if (m.deletable) m.delete()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(Message<Boolean>)###(delete())#',
                            `enquanto executava #(defaultOnChange())# para a question "#(${options.name})#"`,
                            `no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(Message)#:', m,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });


                /** Filters if content length is in valid range */
                if (m.content.length < minLength) {
                    this.refreshQuestion({ warnMessage: lessThanTheMinimumLengthMessage });
                    return null;
                }
                if (m.content.length > maxLength) {
                    this.refreshQuestion({ warnMessage: greaterThanTheMaximumLengthMessage });
                    return null;
                }


                /** Filters the input if have `options.onChangeFilter` */
                const filteredInput = await options.onChangeFilter?.bind(this)(m);


                if (typeof filteredInput !== 'undefined') {
                    this.refreshQuestion({ warnMessage: filteredInput });

                    return null;
                }



                /** Saves the user response */
                this.questions.get(options.name)!.response = m.content;


                if (options.onResponseUpdate)
                    await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);



                this.refreshQuestion({ infoMessage: fixMessage });

                return null;
            }

            /** Is executed when don't have a `option.onCleanButtonClick`  */
            async function defaultOnCleanButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>,
            ) {
                if (!i.deferred && !i.replied) await i.deferUpdate()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                            'enquanto executava #(defaultOnCleanButtonClick())#',
                            `para a question "#(${options.name})#" no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(ButtonInteraction)#:', i,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });



                if (!this.questions.get(options.name))
                    throw new Error(`Don't exists a question with this name: "${options.name}"`);

                /** Saves the user response */
                this.questions.get(options.name)!.response = undefined;



                if (options.onClean) await options.onClean.bind(this)(this.questions.get(options.name)!);
                if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);



                this.refreshQuestion();

                return undefined;
            }

            /** Is executed when don't have a `option.onChangeQuestionButtonClick` */
            async function defaultOnChangeQuestionButtonClick(
                this: Form,
                action: ChangeQuestionAction,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnChangeQuestionButtonClickFactory(options).bind(this)(action, i) as Returned;
            }

            /** Is executed when don't have a `option.onFinishFormButtonClick` */
            async function defaultOnFinishFormButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnFinishFormButtonClickFactory(options).bind(this)(i) as Returned;
            }

        },

        async Integer<Req extends boolean>(
            this: Form,
            options: IntegerQuestionOptions<Req>
        ) {
            if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);


            // Defining defaults

            const min = options.min ?? Number.MIN_SAFE_INTEGER;
            const max = options.max ?? Number.MAX_SAFE_INTEGER;

            const lessThanTheMinimumMessage = options.lessThanTheMinimumMessage ?? `Valor mínimo: ${min}`;
            const greaterThanTheMaximumMessage = options.greaterThanTheMaximumMessage ?? `Valor máximo: ${max}`;
            const notAIntegerMessage = options.notAIntegerMessage ?? 'Precisa ser um número inteiro!';



            /** The Integer question is a extension of String question... */


            const collectedIntegerAsString = await this.askers.String.bind(this)({
                ...options,
                async onChangeFilter(this, m) {
                    /** Verifies if the content of the input message is a integer number */
                    if (!/^-?\d+$/g.test((m as Message).content.trim())) {
                        return notAIntegerMessage;
                    }

                    const numericalContent = Number((m as Message).content.trim());

                    /** Verifies if the inputed number is in the valid range */
                    if (numericalContent < min) {
                        return lessThanTheMinimumMessage;
                    } else if (numericalContent > max) {
                        return greaterThanTheMaximumMessage;
                    }

                    /** Executes the `onChangeFilter` provided externally  */
                    return (await options.onChangeFilter?.bind(this)(m as Message));
                },


                async onResponseUpdate(this, question) {
                    if (!this.questions.get(question.options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                    /** Converts the response of the question to a number immediately after the response update */
                    if (typeof this.questions.get(question.options.name)!.response === 'string')
                        this.questions.get(question.options.name)!.response = Number(this.questions.get(question.options.name)!.response);

                    /** Executes the `onResponseUpdate` provided externally */
                    return await options.onResponseUpdate?.bind(this)(question);
                },


                onFinishFilters: options.onFinishFilters?.map((filter) => {
                    /** New filter function that is addapted to numerical response */
                    const newFilter: Required<StringQuestionOptions<Req>>['onFinishFilters'][number] =
                        (response) => filter(response !== undefined ? Number(response) : undefined);


                    return newFilter;
                }),



                onChange: options.onChange ? async (m) => {
                    const result = (await options.onChange!.bind(this)(m as Message));

                    if (typeof result === 'number') return result.toString();
                    else return result;
                } : undefined,
                onCleanButtonClick: options.onCleanButtonClick ? async (m) => {
                    const result = (await options.onCleanButtonClick!.bind(this)(m));

                    if (typeof result === 'number') return result.toString();
                    else return result;
                } : undefined,
                onChangeQuestionButtonClick: options.onChangeQuestionButtonClick ? async (a, i) => {
                    const result = (await options.onChangeQuestionButtonClick!.bind(this)(a, i));

                    if (typeof result === 'number') return result.toString();
                    else return result;
                } : undefined,
                onFinishFormButtonClick: options.onFinishFormButtonClick ? async (i) => {
                    const result = (await options.onFinishFormButtonClick!.bind(this)(i));

                    if (typeof result === 'number') return result.toString();
                    else return result;
                } : undefined
            });

            return (collectedIntegerAsString ? Number(collectedIntegerAsString) : undefined) as Req extends true ? number : (number | undefined);
        },

        async Boolean<Req extends boolean>(
            this: Form,
            options: BooleanQuestionOptions<Req>
        ) {
            const thisQuestion = this.questions.get(options.name) as Question<'Boolean'> | undefined;

            if (!thisQuestion) throw new Error(`Don't exists a question with this name: "${options.name}"`);

            type Returned = Req extends true ? boolean : (boolean | undefined)


            // Defining defaults

            const placeholder = options.placeholder ?? '';

            const truthyButton: BaseButtonDataOption = {
                customId: options.truthyButton?.customId ?? `truthy-button-${Date.now()}`,
                label: options.truthyButton?.label ?? 'Sim',
                hidden: options.truthyButton?.hidden ?? false
            };

            const falsyButton: BaseButtonDataOption = {
                customId: options.falsyButton?.customId ?? `falsy-button-${Date.now()}`,
                label: options.falsyButton?.label ?? 'Não',
                hidden: options.falsyButton?.hidden ?? false
            };

            /** Add markers to `options.message` to user know if is a required question or no. Add markdown prefix to display as a title */
            const formattedMessage =
                (options.required ? `## \\* ${options.message}` : `## (opcional) ${options.message}`) +
                (options.infoMessage ? `\n> ${options.infoMessage}` : '') +
                (options.warnMessage ? `\n\`\`\`ansi\n${discordAnsi.red()(options.warnMessage)}\n\`\`\`` : '') +
                `\n\`\`\`ansi\n${typeof thisQuestion.response === 'boolean' ? thisQuestion.response ? truthyButton.label : falsyButton.label : discordAnsi.gray()(placeholder)}\n\`\`\``;


            const cleanButton: BaseButtonDataOption = {
                label: options.cleanButton?.label ?? 'Limpar',
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


            const onChange: OmitThisParameter<Required<typeof options>['onChange']> =
                options.onChange?.bind(this) ?? defaultOnChange.bind(this) as OmitThisParameter<Required<typeof options>['onChange']>;
            const onCleanButtonClick: OmitThisParameter<Required<typeof options>['onCleanButtonClick']> =
                options.onCleanButtonClick?.bind(this) ?? defaultOnCleanButtonClick.bind(this);
            const onChangeQuestionButtonClick: OmitThisParameter<Required<typeof options>['onChangeQuestionButtonClick']> =
                options.onChangeQuestionButtonClick?.bind(this) ?? defaultOnChangeQuestionButtonClick.bind(this);
            const onFinishFormButtonClick: OmitThisParameter<Required<typeof options>['onFinishFormButtonClick']> =
                options.onFinishFormButtonClick?.bind(this) ?? defaultOnFinishFormButtonClick.bind(this);




            // Making the question message and his components

            const questionComponents = [
                rowBooleanButtonsFactory(),
                ...(!cleanButton.hidden ? [this.rowCleanButtonFactory(cleanButton.customId, cleanButton.label)] : []),
                this.rowNavigateBetweenQuestionsFactory(
                    prevQuestionButton.hidden ? undefined : prevQuestionButton,
                    nextQuestionButton.hidden ? undefined : nextQuestionButton,
                    finishFormButton.hidden ? undefined : finishFormButton
                ),
            ];


            const question = await this.interaction.editReply({
                message: this.questionMessage,
                content: formattedMessage,
                components: questionComponents
            });




            // Creates the question collector (collects any interaction in question components)
            const collector = this.createMessageComponentCollector(question, {
                filter: this.defaultCollectorFilter.bind(this),
                idle: maxIdleTime,
            });



            return await new Promise<Returned>((resolve, reject) => {
                collector.on('collect', async (i) => {
                    /** Case the user select a value */
                    if (
                        (i.customId === falsyButton.customId || i.customId === truthyButton.customId) &&
                        i.componentType === ComponentType.Button
                    ) {

                        await onChange(i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });

                    }



                    /** Case the user click to goBack to prev question or click to advance to next question */
                    else if (
                        (i.customId === prevQuestionButton.customId || i.customId === nextQuestionButton.customId) &&
                        i.componentType === ComponentType.Button
                    ) {

                        await onChangeQuestionButtonClick(i.customId === prevQuestionButton.customId ? 'goBack' : 'advance', i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });

                    }



                    /** Case the user click to clean selected option */
                    else if (
                        i.customId === cleanButton.customId &&
                        i.componentType === ComponentType.Button
                    ) {
                        await onCleanButtonClick(i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });
                    }


                    /** Case the user click to finish the form */
                    else if (
                        i.customId === finishFormButton.customId &&
                        i.componentType === ComponentType.Button
                    ) {
                        await onFinishFormButtonClick(i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });
                    }

                });

                collector.on('end', (_collected, reason) => {
                    if (reason === 'time' || reason === 'idle') {
                        if (!this.finished) this.justFinishForm(reason);
                        reject(reason);
                    }
                });
            });




            /** Is executed when don't have a `option.onChange`  */
            async function defaultOnChange(
                this: Form,
                i: ButtonInteraction<CacheType>,
            ) {
                if (i instanceof MessageComponentInteraction && !i.deferred && !i.replied) await i.deferUpdate()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                            'enquanto executava #(defaultOnChange())#',
                            `para a question "#(${options.name})#"`,
                            `no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n`,
                            '#(Erro)#:', error,
                            '\n#(ButtonInteraction)#:', i,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });



                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                /** Filters the input if have `options.onChangeFilter` */
                const filteredInput = await options.onChangeFilter?.bind(this)(i);

                if (filteredInput) {
                    this.refreshQuestion({ warnMessage: filteredInput });

                    return null;
                }




                /** Saves the user response */
                this.questions.get(options.name)!.response = i.customId === falsyButton.customId ? false : (i.customId === truthyButton.customId ? true : undefined);



                if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);





                if (!filteredInput) this.refreshQuestion();

                return null;
            }

            /** Is executed when don't have a `option.onCleanButtonClick`  */
            async function defaultOnCleanButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>,
            ) {
                if (!i.deferred && !i.replied) await i.deferUpdate()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                            'enquanto executava #(defaultOnCleanButtonClick())#',
                            `para a question "#(${options.name})#"`,
                            `no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(ButtonInteraction)#:', i,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });



                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                /** Saves the user response */
                this.questions.get(options.name)!.response = undefined;




                if (options.onClean) await options.onClean.bind(this)(this.questions.get(options.name)!);
                if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);


                this.refreshQuestion();

                return undefined;
            }

            /** Is executed when don't have a `option.onChangeQuestionButtonClick` */
            async function defaultOnChangeQuestionButtonClick(
                this: Form,
                action: ChangeQuestionAction,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnChangeQuestionButtonClickFactory(options).bind(this)(action, i) as Returned;
            }

            /** Is executed when don't have a `option.onFinishFormButtonClick` */
            async function defaultOnFinishFormButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnFinishFormButtonClickFactory(options).bind(this)(i) as Returned;
            }


            function rowBooleanButtonsFactory() {
                return new ActionRowBuilder<ButtonBuilder>()
                    .setComponents(
                        ...(falsyButton.hidden ? [] : [new ButtonBuilder()
                            .setCustomId(falsyButton.customId)
                            .setLabel(falsyButton.label)
                            .setStyle(ButtonStyle.Danger)]),
                        ...(truthyButton.hidden ? [] : [new ButtonBuilder()
                            .setCustomId(truthyButton.customId)
                            .setLabel(truthyButton.label)
                            .setStyle(ButtonStyle.Success)])
                    );
            }

        },

        async Attachments<Req extends boolean>(
            this: Form,
            options: AttachmentsQuestionOptions<Req>
        ) {
            const thisQuestion = this.questions.get(options.name) as Question<'Attachments'> | undefined;

            if (!thisQuestion) throw new Error(`Don't exists a question with this name: "${options.name}"`);

            type Returned = Req extends true ? Attachment[] : (Attachment[] | [])


            // Defining defaults

            const minAttachments = Math.max(options.minAttachments ?? 0, 0);
            const maxAttachments = Math.max(options.maxAttachments ?? minAttachments, minAttachments);

            const required = minAttachments > 0 as Req;

            const attachmentIndex = options.attachmentIndex ?? 0;

            /** Add markers to `options.message` to user know if is a required question or no. Add markdown prefix to display as a title */
            const formattedMessage =
                (required ? `## \\* ${options.message}` : `## (opcional) ${options.message}`) +
                (options.infoMessage ? `\n> ${options.infoMessage}` : '') +
                (options.warnMessage ? `\n\`\`\`ansi\n${discordAnsi.red()(options.warnMessage)}\n\`\`\`` : '') +
                (thisQuestion.response[attachmentIndex]?.name ? `\n\`\`\`ansi\n${thisQuestion.response[attachmentIndex]?.name}\n\`\`\`` : '') +
                (thisQuestion.response[attachmentIndex]?.url ?? '');


            const cleanButton: BaseButtonDataOption = {
                label: options.cleanButton?.label ?? 'Limpar',
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

            const prevAttachmentButton: BaseButtonDataOption = {
                customId: options.prevAttachmentButton?.customId ?? `prev-attachment-button-${Date.now()}`,
                label: options.prevAttachmentButton?.label ?? '<<',
                hidden: options.prevAttachmentButton?.hidden ?? false
            };

            const nextAttachmentButton: BaseButtonDataOption = {
                customId: options.nextAttachmentButton?.customId ?? `next-attachment-button-${Date.now()}`,
                label: options.nextAttachmentButton?.label ?? '>>',
                hidden: options.nextAttachmentButton?.hidden ?? false
            };


            const maxIdleTime = options.collectorIdle ?? 60_000;
            const fixMessage = options.fixMessage ?? 'Você pode substituir o valor atual enviando outra resposta.';
            const greaterThanTheMaximumMessage = options.greaterThanTheMaximumMessage ?? `O máximo de arquivos são ${maxAttachments}`;

            const onChange: OmitThisParameter<Required<typeof options>['onChange']> =
                options.onChange?.bind(this) ?? defaultOnChange.bind(this) as OmitThisParameter<Required<typeof options>['onChange']>;
            const onCleanButtonClick: OmitThisParameter<Required<typeof options>['onCleanButtonClick']> =
                options.onCleanButtonClick?.bind(this) ?? defaultOnCleanButtonClick.bind(this);
            const onChangeQuestionButtonClick: OmitThisParameter<Required<typeof options>['onChangeQuestionButtonClick']> =
                options.onChangeQuestionButtonClick?.bind(this) ?? defaultOnChangeQuestionButtonClick.bind(this);
            const onFinishFormButtonClick: OmitThisParameter<Required<typeof options>['onFinishFormButtonClick']> =
                options.onFinishFormButtonClick?.bind(this) ?? defaultOnFinishFormButtonClick.bind(this);
            const onChangeAttachmentButtonClick: OmitThisParameter<Required<typeof options>['onChangeAttachmentButtonClick']> =
                options.onChangeAttachmentButtonClick?.bind(this) ?? defaultOnChangeAttachmentButtonClick.bind(this);




            // Making the question message and his components

            const questionComponents = [
                ...(!cleanButton.hidden ? [this.rowCleanButtonFactory(cleanButton.customId, cleanButton.label)] : []),
                ...(maxAttachments > 1 ? [rowAttachmentsPaginationFactory()] : []),
                this.rowNavigateBetweenQuestionsFactory(
                    prevQuestionButton.hidden ? undefined : prevQuestionButton,
                    nextQuestionButton.hidden ? undefined : nextQuestionButton,
                    finishFormButton.hidden ? undefined : finishFormButton
                ),
            ];


            const question = await this.interaction.editReply({
                message: this.questionMessage,
                content: formattedMessage,
                components: questionComponents
            });




            // Creates the question collector (collects any interaction in question components)
            const componentCollector = this.createMessageComponentCollector(question, {
                filter: this.defaultCollectorFilter.bind(this),
            });

            // Creates the question message collector (in current channel) (collects any message sent by the author)
            const messageCollector = this.createMessageCollector(question.channel, {
                filter: (m) => m.author.id === this.interaction.user.id,
                idle: maxIdleTime,
            });




            return await new Promise<Returned>((resolve, reject) => {
                messageCollector.on('collect', async (m) => {
                    if (!m.attachments.size) return;

                    await onChange(m)
                        .then((response) => {
                            if (response !== null) resolve(response as Returned);
                        })
                        .catch((error: unknown) => {
                            if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                        });
                });

                messageCollector.on('end', (_collected, reason) => componentCollector.stop(reason));




                componentCollector.on('collect', async (i) => {
                    /** Case the user click to goBack to prev question or click to advance to next question */
                    if (
                        (i.customId === prevQuestionButton.customId || i.customId === nextQuestionButton.customId) &&
                        i.componentType === ComponentType.Button
                    ) {

                        await onChangeQuestionButtonClick(i.customId === prevQuestionButton.customId ? 'goBack' : 'advance', i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });

                    }



                    /** Case the user click to clean inputed value */
                    else if (
                        i.customId === cleanButton.customId &&
                        i.componentType === ComponentType.Button
                    ) {
                        await onCleanButtonClick(i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });
                    }


                    /** Case the user click to finish the form */
                    else if (
                        i.customId === finishFormButton.customId &&
                        i.componentType === ComponentType.Button
                    ) {
                        await onFinishFormButtonClick(i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });
                    }



                    /** Case the user click to goBack to prev attachment or click to advance to next attachment */
                    else if (
                        (i.customId === prevAttachmentButton.customId || i.customId === nextAttachmentButton.customId) &&
                        i.componentType === ComponentType.Button
                    ) {
                        await onChangeAttachmentButtonClick(i.customId === prevAttachmentButton.customId ? 'goBack' : 'advance', i)
                            .then((response) => {
                                if (response !== null) resolve(response as Returned);
                            })
                            .catch((error: unknown) => {
                                if (isObject(error) && (error as Obj).rejectReason) reject((error as Obj).rejectReason);
                            });
                    }
                });


                componentCollector.on('end', (_collected, reason) => {
                    if (reason === 'time' || reason === 'idle') {
                        if (!this.finished) this.justFinishForm(reason);
                        reject(reason);
                    }
                });
            });


            /** Is executed when don't have a `option.onChange`  */
            async function defaultOnChange(this: Form, m: Message) {
                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                if (m.deletable) m.delete()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(Message<Boolean>)###(delete())#',
                            'enquanto executava #(defaultOnChange())#',
                            `para a question "#(${options.name})#"`,
                            `no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(Message)#:', m,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });

                /** Filter if the number of attachments that the user has been sent is higher than `maxAttachments` */
                if (m.attachments.size + Math.min(attachmentIndex, Math.max((this.questions.get(options.name)!.response as Returned | undefined)?.length ?? 0, 0)) > maxAttachments) {
                    this.refreshQuestion({ warnMessage: greaterThanTheMaximumMessage });
                    return null;
                }

                /** Filters the input if have `options.onChangeFilter` */
                const filteredInput = await options.onChangeFilter?.bind(this)(m);


                if (filteredInput) {
                    this.refreshQuestion({ warnMessage: filteredInput });

                    return null;
                }


                /** Saves the user response */
                if (Array.isArray(this.questions.get(options.name)!.response))
                    (this.questions.get(options.name)!.response as Returned).splice(attachmentIndex, m.attachments.size, ...m.attachments.toJSON());
                else this.questions.get(options.name)!.response = m.attachments.toJSON();



                if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);



                if (!filteredInput) this.refreshQuestion({ infoMessage: fixMessage });

                return null;
            }

            /** Is executed when don't have a `option.onCleanButtonClick`  */
            async function defaultOnCleanButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>,
            ) {
                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);


                if (!i.deferred && !i.replied) await i.deferUpdate()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                            'enquanto executava #(defaultOnCleanButtonClick())#',
                            `para a question "#(${options.name})#"`,
                            `no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(ButtonInteraction)#:', i,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });


                /** Saves the user response */
                if (Array.isArray(this.questions.get(options.name)!.response))
                    (this.questions.get(options.name)!.response as Returned).splice(attachmentIndex, 1);
                else this.questions.get(options.name)!.response = [];



                if (options.onClean) await options.onClean.bind(this)(this.questions.get(options.name)!);
                if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);

                this.emit('responseUpdate', this.questions.get(options.name)!);



                this.refreshQuestion();

                return this.questions.get(options.name)!.response as Returned;
            }

            /** Is executed when don't have a `option.onChangeQuestionButtonClick` */
            async function defaultOnChangeQuestionButtonClick(
                this: Form,
                action: ChangeQuestionAction,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnChangeQuestionButtonClickFactory(options).bind(this)(action, i) as Returned;
            }

            /** Is executed when don't have a `option.onChangeAttachmentButtonClick` */
            async function defaultOnChangeAttachmentButtonClick(
                this: Form,
                action: ChangeQuestionAction,
                i: ButtonInteraction<CacheType>
            ) {
                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                if (!i.deferred && !i.replied) await i.deferUpdate()
                    .catch((error: unknown) => {
                        log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                            'enquanto executava #(defaultOnChangeAttachmentButtonClick)#',
                            `para a question "#(${options.name})#"`,
                            `no Form "#(${this.name})#",`,
                            `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                            `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                            '\n#(Erro)#:', error,
                            '\n#(ButtonInteraction)#:', i,
                            '\n#(CommandInteraction)#:', this.interaction
                        );
                        BaseError.handle(error);
                        throw error;
                    });


                /** Changes the attachmentIndex */
                (this.questions.get(options.name)! as Question<'Attachments'>).options.attachmentIndex =
                    Math.min(Math.max(attachmentIndex + (action === 'goBack' ? -1 : 1), 0), maxAttachments - 1);


                this.refreshQuestion();

                if (options.onChangeAttachment) await options.onChangeAttachment.bind(this)(action, i);


                return this.questions.get(options.name)!.response as Returned;
            }

            /** Is executed when don't have a `option.onFinishFormButtonClick` */
            async function defaultOnFinishFormButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>
            ) {
                return await this.defaultOnFinishFormButtonClickFactory(options).bind(this)(i) as Returned;
            }


            function rowAttachmentsPaginationFactory() {
                return new ActionRowBuilder<ButtonBuilder>()
                    .setComponents(
                        new ButtonBuilder()
                            .setCustomId(prevAttachmentButton.customId)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(attachmentIndex === 0)
                            .setLabel(prevAttachmentButton.label),
                        new ButtonBuilder()
                            .setCustomId('current-attachment-button-' + Date.now())
                            .setDisabled()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(`${attachmentIndex + 1}/${maxAttachments}`),
                        new ButtonBuilder()
                            .setCustomId(nextAttachmentButton.customId)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(attachmentIndex + 1 === maxAttachments)
                            .setLabel(nextAttachmentButton.label),
                    );
            }

        }
    };

    public checkers = {
        async StringSelect<Returns extends string, Req extends boolean>(
            this: Form,
            options: StringSelectQuestionOptions<Req, Returns>,
            response: Awaited<ReturnType<typeof this.askers.StringSelect<Returns, Req>>>
        ) {
            if (response.some((value) => !options.select.options.map(option => option.value).includes(value)))
                return options.outOfScopeMessage ?? 'Opção selecionada fora do escopo de opções aceitas';

            if (options.required && !response.length)
                return options.requiredFieldMessage ?? 'Este é um campo obrigatório, você deve selecionar algum valor.';

            if (options.onFinishFilters)
                return (await Promise.all(options.onFinishFilters.map((filter) => { return filter(response); }))).find(reason => reason !== undefined);
        },

        async String<Req extends boolean>(
            this: Form,
            options: StringQuestionOptions<Req>,
            response: Awaited<ReturnType<typeof this.askers.String<Req>>>
        ) {
            if (options.required && !response)
                return options.requiredFieldMessage ?? 'Este é um campo obrigatório!';

            if (options.onFinishFilters)
                return (await Promise.all(options.onFinishFilters.map((filter) => { return filter(response); }))).find(reason => reason !== undefined);
        },

        async Integer<Req extends boolean>(
            this: Form,
            options: IntegerQuestionOptions<Req>,
            response: Awaited<ReturnType<typeof this.askers.Integer<Req>>>
        ) {
            if (options.required && typeof response !== 'number')
                return options.requiredFieldMessage ?? 'Este é um campo obrigatório!';

            if (options.onFinishFilters)
                return (await Promise.all(options.onFinishFilters.map((filter) => { return filter(response); }))).find(reason => reason !== undefined);
        },

        async Boolean<Req extends boolean>(
            this: Form,
            options: BooleanQuestionOptions<Req>,
            response: Awaited<ReturnType<typeof this.askers.Boolean<Req>>>
        ) {
            if (options.required && typeof response !== 'boolean')
                return options.requiredFieldMessage ?? 'Este é um campo obrigatório!';

            if (options.onFinishFilters)
                return (await Promise.all(options.onFinishFilters.map((filter) => { return filter(response); }))).find(reason => reason !== undefined);
        },

        async Attachments<Req extends boolean>(
            this: Form,
            options: AttachmentsQuestionOptions<Req>,
            response: Awaited<ReturnType<typeof this.askers.Attachments<Req>>>
        ) {
            const minAttachments = Math.max(options.minAttachments ?? 0, 0);
            const maxAttachments = Math.max(options.maxAttachments ?? minAttachments, minAttachments);

            const required = minAttachments > 0 as Req;

            const lessThanTheMinimumAttachmentsMessage = options.lessThanTheMinimumMessage ?? `O mínimo de arquivos são ${minAttachments}`;
            const greaterThanTheMaximumAttachmentsMessage = options.greaterThanTheMaximumMessage ?? `O máximo de arquivos são ${maxAttachments}`;


            if (required && !response.length) {
                (this.questions.get(options.name)! as Question<'Attachments'>).options.attachmentIndex = 0;

                return options.requiredFieldMessage ?? 'Este é um campo obrigatório!';
            } else if (response.length < minAttachments) {
                (this.questions.get(options.name)! as Question<'Attachments'>).options.attachmentIndex = response.length;

                return lessThanTheMinimumAttachmentsMessage;
            } else if (response.length > maxAttachments) {
                (this.questions.get(options.name)! as Question<'Attachments'>).options.attachmentIndex = maxAttachments - 1;

                return greaterThanTheMaximumAttachmentsMessage;
            }


            if (options.onFinishFilters)
                return (await Promise.all(options.onFinishFilters.map((filter) => { return filter(response); }))).find(reason => reason !== undefined);
        },
    };













    // defaultsFunctions


    /** Creates a `defaultOnChangeQuestionButtonClick` */
    private defaultOnChangeQuestionButtonClickFactory<Type extends QuestionType>(options: Parameters<Form['askers'][Type]>[0]) {
        /** Is executed when don't have a `option.onChangeQuestionButtonClick` */
        return async function defaultOnChangeQuestionButtonClick(
            this: Form,
            action: ChangeQuestionAction,
            i: ButtonInteraction<CacheType>
        ) {
            if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);


            if (!i.deferred && !i.replied) await i.deferUpdate()
                .catch((error: unknown) => {
                    log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                        'enquanto executava #(defaultOnChangeQuestionButtonClick)#',
                        `para a question "#(${options.name})#"`,
                        `no Form "#(${this.name})#",`,
                        `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                        `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                        '\n#(Erro)#:', error,
                        '\n#(ButtonInteraction)#:', i,
                        '\n#(CommandInteraction)#:', this.interaction
                    );
                    BaseError.handle(error);
                    throw error;
                });



            const returns = this.questions.get(options.name)!.response as Awaited<ReturnType<Form['askers'][Type]>> | undefined;



            this.changeQuestion(action);

            if (options.onChangeQuestion) await options.onChangeQuestion.bind(this)(action, i);


            return returns;
        };
    }

    /** Creates a `defaultOnFinishFormButtonClick` */
    private defaultOnFinishFormButtonClickFactory<Type extends QuestionType>(options: Parameters<Form['askers'][Type]>[0]) {
        /** Is executed when don't have a `option.onFinishFormButtonClick` */
        return async function defaultOnFinishFormButtonClick(
            this: Form,
            i: ButtonInteraction<CacheType>
        ) {
            if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);



            if (!i.deferred && !i.replied) await i.deferUpdate()
                .catch((error: unknown) => {
                    log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                        'enquanto executava #(defaultOnFinishFormButtonClick)#',
                        `para a question "#(${options.name})#"`,
                        `no Form "#(${this.name})#",`,
                        `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                        `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                        '\n#(Erro)#:', error,
                        '\n#(ButtonInteraction)#:', i,
                        '\n#(CommandInteraction)#:', this.interaction
                    );
                    BaseError.handle(error);
                    throw error;
                });




            const returns = this.questions.get(options.name)!.response as Awaited<ReturnType<Form['askers'][Type]>> | undefined;


            this.finishForm();


            if (options.onFinishForm) await options.onFinishForm.bind(this)(i);

            return returns;
        };
    }









    private defaultCollectorFilter(this: Form, i: Parameters<CollectorFilter<[StringSelectMenuInteraction<CacheType> | UserSelectMenuInteraction<CacheType> | RoleSelectMenuInteraction<CacheType> | MentionableSelectMenuInteraction<CacheType> | ChannelSelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>]>>[0]) {
        return i.user.id === this.interaction.user.id;
    };






    private createMessageComponentCollector(message: Message, options?: MessageCollectorOptionsParams<MessageComponentType, boolean> | undefined) {
        const collector = message.createMessageComponentCollector(options);

        this.collectors.push(collector);
        this.interactionCollectors.push(collector);

        return collector;
    }

    private createMessageCollector(channel: TextBasedChannel, options?: MessageCollectorOptions | undefined) {
        const collector = channel.createMessageCollector(options);

        this.collectors.push(collector);
        this.messageCollectors.push(collector);

        return collector;
    }






    // Action row factories ----------------------------------------------

    private rowNavigateBetweenQuestionsFactory(prevQuestionButton?: BaseButtonData, nextQuestionButton?: BaseButtonData, finishFormButton?: BaseButtonData) {
        const currentQuestionButton = new ButtonBuilder()
            .setCustomId(`current-question-button-${Date.now()}`)
            .setLabel(`${(this.currentQuestionIndex ?? 0) + 1}/${this.questions.size}`)
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .setComponents(...[
                ...(prevQuestionButton ? [this.prevQuestionButtonFactory(prevQuestionButton)] : []),
                currentQuestionButton,
                ...(nextQuestionButton ? [this.nextQuestionButtonFactory(nextQuestionButton)] : []),
                ...(finishFormButton ? [this.finishFormButtonFactory(finishFormButton)] : []),
            ]);

        return actionRow;
    }

    private rowCleanButtonFactory(customId: string, label: string) {
        return new ActionRowBuilder<ButtonBuilder>()
            .setComponents(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(label)
                    .setStyle(ButtonStyle.Secondary)
            );
    }



    // Button factories --------------------------------------------------------

    private prevQuestionButtonFactory(nextQuestionButton: BaseButtonData) {
        return this.basicButtonFactory(nextQuestionButton)
            .setStyle(ButtonStyle.Secondary);
    }

    private nextQuestionButtonFactory(nextQuestionButton: BaseButtonData) {
        return this.basicButtonFactory(nextQuestionButton)
            .setStyle(ButtonStyle.Success);
    }

    private finishFormButtonFactory(finishFormButton: BaseButtonData) {
        return this.basicButtonFactory(finishFormButton)
            .setStyle(ButtonStyle.Success);
    }

    private basicButtonFactory(button: BaseButtonData) {
        return new ButtonBuilder()
            .setCustomId(button.customId)
            .setLabel(button.label)
            .setDisabled(!!button.disabled);
    }







    // Overwrite EventEmitter methods ----------------

    public on<Event extends keyof FormEvents>(
        event: Event,
        listener: (...args: FormEvents[Event]) => unknown,
    ): this;
    public on<Event extends string | symbol>(
        event: Exclude<Event, keyof FormEvents>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (...args: any[]) => unknown,
    ): this { return super.on(event, listener); };

    public once<Event extends keyof FormEvents>(
        event: Event,
        listener: (...args: FormEvents[Event]) => unknown,
    ): this;
    public once<Event extends string | symbol>(
        event: Exclude<Event, keyof FormEvents>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (...args: any[]) => unknown,
    ): this { return super.once(event, listener); };

    public emit<Event extends keyof FormEvents>(event: Event, ...args: FormEvents[Event]): boolean;
    public emit<Event extends string | symbol>(event: Exclude<Event, keyof FormEvents>, ...args: unknown[]): boolean { return super.emit(event, ...args); };

    public off<Event extends keyof FormEvents>(
        event: Event,
        listener: (...args: FormEvents[Event]) => unknown,
    ): this;
    public off<Event extends string | symbol>(
        event: Exclude<Event, keyof FormEvents>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (...args: any[]) => unknown,
    ): this { return super.off(event, listener); };

    public removeAllListeners<Event extends keyof FormEvents>(event?: Event): this;
    public removeAllListeners<Event extends string | symbol>(event?: Exclude<Event, keyof FormEvents>): this { return super.removeAllListeners(event); };
}
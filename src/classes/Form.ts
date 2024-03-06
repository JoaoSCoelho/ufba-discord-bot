/* eslint-disable @typescript-eslint/ban-ts-comment */
import { EventEmitter } from 'node:events';
import { ActionRowBuilder, Attachment, AttachmentBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChannelSelectMenuInteraction, Collection, CollectorFilter, CommandInteraction, ComponentType, InteractionCollector, MappedInteractionTypes, MentionableSelectMenuInteraction, Message, MessageCollector, MessageCollectorOptionsParams, MessageComponentInteraction, MessageComponentType, RoleSelectMenuInteraction, SelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuInteraction } from 'discord.js';
import LocalClient from './LocalClient';
import { Question, QuestionAttachments, QuestionBoolean, QuestionInteger, QuestionString, QuestionStringSelect, QuestionType, BaseButtonData, BaseButtonDataOption, ParamQuestionAttachments, ParamQuestionBoolean, ParamQuestionInteger, ParamQuestionString, ParamQuestionStringSelect, StringSelectMenuData, StringSelectQuestionOptions, ChangeQuestionAction, StringQuestionOptions, IntegerQuestionOptions, BooleanQuestionOptions, AttachmentsQuestionOptions, BaseQuestionOptions } from './Form.types';
import { FormEvents } from './Form.types';
import isObject from '../utils/isObject';
import { log } from '..';
import discordAnsi from '../utils/discord-ansi';





export default class Form extends EventEmitter {
    // Collectors savers ------------------------

    private collectors: (InteractionCollector<MappedInteractionTypes[MessageComponentType]> | MessageCollector)[] = [];
    private messageCollectors: MessageCollector[] = [];
    private interactionCollectors: InteractionCollector<MappedInteractionTypes[MessageComponentType]>[] = [];

    // Questions controller vars

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
        eventEmitterOptions?: ConstructorParameters<typeof EventEmitter>[0]
    ) {
        super(eventEmitterOptions);

        const DEFAULT_RESPONSES: { [Key in QuestionType]: Question<Key>['response'] } = {
            Attachments: [],
            Boolean: undefined,
            Integer: undefined,
            String: undefined,
            StringSelect: []
        };

        // @ts-ignore
        this.questions = new Collection(questions.map((question, index, array) => [question.options.name, {
            response: DEFAULT_RESPONSES[question.type],

            ...question,

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
        }]));

    }




    /** Starts the form */
    public async run() {
        if (!this.interaction.deferred) await this.interaction.deferReply({ ephemeral: true })
            .catch((error) => {
                log.error(`Erro ao usar #i(CommandInteraction<CacheType>)###(deferReply())# enquanto executava #(run())# no Form "#(${this.name})#", aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(CommandInteraction)#:', this.interaction);
                this.emit('error', error);
                throw error;
            });



        if (this.questions.size) {
            const questionMessageOptions = {
                content: 'Iniciando formulário...',
            };

            this.questionMessage = await this.interaction.followUp(questionMessageOptions)
                .catch((error) => {
                    log.error(`Erro ao usar #i(CommandInteraction<CacheType>)###(followUp(Options))# enquanto executava #(run())# no Form "#(${this.name})#", aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(MessageOptions)#:', questionMessageOptions, '\n#(CommandInteraction)#:', this.interaction);
                    this.emit('error', error);
                    throw error;
                });


            /** Starts with the first question */
            this.changeQuestion(0);
        } else {
            this.finishForm();
        };

    }



    private callQuestionAsker(question: Question<QuestionType>) {
        // @ts-ignore
        this.askers[question.type]?.bind(this)(question.options)
            .catch((error: unknown) => {
                this.emit('error', { question, error });
            });
    }


    public refreshQuestion(byPassOptions?: Partial<Pick<BaseQuestionOptions<boolean, QuestionType>, 'warnMessage' | 'infoMessage'>>) {
        if (typeof this.currentQuestionIndex !== 'number') return;


        /** Stop all collectors so that there is no interference with the refreshed question */
        this.collectors.forEach((collector) => collector.stop());

        /** Restarts the question */

        const question = this.questions.toJSON()[this.currentQuestionIndex];

        this.callQuestionAsker({ ...question, options: { ...question.options, ...byPassOptions } });
    }



    public changeQuestion(action: ChangeQuestionAction, byPassOptions?: Partial<Pick<BaseQuestionOptions<boolean, QuestionType>, 'warnMessage' | 'infoMessage'>>): void
    public changeQuestion(toIndex: number, byPassOptions?: Partial<Pick<BaseQuestionOptions<boolean, QuestionType>, 'warnMessage' | 'infoMessage'>>): void
    public changeQuestion(arg: number | ChangeQuestionAction, byPassOptions?: Partial<Pick<BaseQuestionOptions<boolean, QuestionType>, 'warnMessage' | 'infoMessage'>>) {

        this.lastQuestionIndex = this.currentQuestionIndex;
        this.currentQuestionIndex = typeof arg === 'number' ?
            Math.min(Math.max(arg, 0), this.questions.size - 1) :
            arg === 'goBack' ?
                Math.max((this.lastQuestionIndex ?? 0) - 1, 0) :
                Math.min((this.lastQuestionIndex ?? 0) + 1, this.questions.size - 1);


        /** Stop all collectors so that there is no interference with the next question */
        this.collectors.forEach((collector) => collector.stop());


        this.emit('changeQuestion', this.currentQuestionIndex, this.lastQuestionIndex, typeof arg === 'string' ? arg : undefined);

        /** Starts the next question */
        const newQuestion = this.questions.toJSON()[this.currentQuestionIndex];

        this.callQuestionAsker({ ...newQuestion, options: { ...newQuestion.options, ...byPassOptions } });

    }


    public finishForm(reason?: string) {
        if (reason) {
            justFinish.bind(this)();
        } else {
            // Check all questions with checkers
            Promise.all(this.questions.map(async (question) => {
                // @ts-ignore
                const checkerError = await this.checkers[question.type]?.bind(this)(question.options, question.response)
                    .catch((error: unknown) => {
                        throw { question, error };
                    }) as string | undefined;

                return [question.options.name, checkerError] as [string, string | undefined];
            }))
                .then((possiblyErrors: [string, string | undefined][]) => {
                    const foundError = possiblyErrors.find(([, reason]) => reason !== undefined) as [string, string] | undefined;

                    if (foundError) {
                        const questionWithErrorIndex = this.questions.toJSON().findIndex((question) => question.options.name === foundError[0]);

                        return this.changeQuestion(questionWithErrorIndex, { warnMessage: foundError[1] });
                    }

                    justFinish.bind(this)();

                    const questionMessageOptions = {
                        message: this.questionMessage,
                        content: '✅ Formulário concluído!',
                        embeds: [],
                        components: [],
                    };

                    this.interaction.editReply(questionMessageOptions)
                        .catch((error) => {
                            log.error(`Erro ao usar #i(CommandInteraction<CacheType>)###(editReply(Message))# enquanto finalizava o Form "#(${this.name})#", aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(MessageOptions)#:', questionMessageOptions, '\n#(CommandInteraction)#:', this.interaction);
                            this.emit('error', error);
                        });

                })
                .catch((error) => {
                    this.emit('error', error);
                });


        }

        return this.questions.mapValues((question) => question.response);




        function justFinish(this: Form) {
            /** Stop all collectors so that there is no interference on the rest of code execution */
            this.collectors.forEach((collector) => collector.stop());

            this.finished = true;

            this.emit('finishForm', reason, this.questions.mapValues((question) => question.response));
        }
    }





    public askers = {
        async StringSelect<Returns extends string, Req extends boolean>(
            this: Form,
            options: StringSelectQuestionOptions<Req, Returns>
        ) {
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
                    default: (this.questions.get(options.name)?.response as Returns[]).includes(option.value)
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
                options.onChange?.bind(this) ?? defaultOnChange.bind(this) as OmitThisParameter<Required<typeof options>['onChange']>;
            const onCleanButtonClick: OmitThisParameter<Required<typeof options>['onCleanButtonClick']> =
                options.onCleanButtonClick?.bind(this) ?? defaultOnCleanButtonClick.bind(this);
            const onChangeQuestionButtonClick: OmitThisParameter<Required<typeof options>['onChangeQuestionButtonClick']> =
                options.onChangeQuestionButtonClick?.bind(this) ?? defaultOnChangeQuestionButtonClick.bind(this);
            const onFinishFormButtonClick: OmitThisParameter<Required<typeof options>['onFinishFormButtonClick']> =
                options.onFinishFormButtonClick?.bind(this) ?? defaultOnFinishFormButtonClick.bind(this);




            // Making the question message and his components

            const questionComponents = [
                rowSelectMenuFactory(select),
                this.rowNavigateBetweenQuestionsFactory(
                    prevQuestionButton.hidden ? undefined : prevQuestionButton,
                    nextQuestionButton.hidden ? undefined : nextQuestionButton,
                    finishFormButton.hidden ? undefined : finishFormButton
                ),
                ...(!cleanButton.hidden ? [this.rowCleanButtonFactory(cleanButton.customId, cleanButton.label)] : [])
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
                                .catch((error) => {
                                    if (isObject(error) && error.rejectReason) reject(error.rejectReason);
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
                                .catch((error) => {
                                    if (isObject(error) && error.rejectReason) reject(error.rejectReason);
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
                                .catch((error) => {
                                    if (isObject(error) && error.rejectReason) reject(error.rejectReason);
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
                                .catch((error) => {
                                    if (isObject(error) && error.rejectReason) reject(error.rejectReason);
                                });
                        }

                    });

                    collector.on('end', (_collected, reason) => {
                        if (reason === 'time' || reason === 'idle') {
                            if (!this.finished) this.finishForm(reason);
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
                if (i instanceof MessageComponentInteraction && !i.deferred) await i.deferUpdate()
                    .catch((error) => {
                        log.error(`Erro ao usar #i(StringSelectMenuInteraction<CacheType>)###(deferUpdate())# enquanto executava #(defaultOnChange())# para a question "#(${options.name})#" no Form "#(${this.name})#", aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(StringSelectMenuInteraction)#:', i, '\n#(CommandInteraction)#:', this.interaction);
                        throw error;
                    });



                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                /** Filters the input if have `options.onChangeFilter` */
                const filteredInput = await options.onChangeFilter?.bind(this)(i);

                if (filteredInput) {
                    this.refreshQuestion({ warnMessage: filteredInput });

                    return null;
                }




                /** Saves the user responde */
                this.questions.get(options.name)!.response = i.values;



                this.emit('responseUpdate', this.questions.get(options.name)!);

                if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);



                if (!filteredInput) this.refreshQuestion();

                return null;
            }

            /** Is executed when don't have a `option.onCleanButtonClick`  */
            async function defaultOnCleanButtonClick(
                this: Form,
                i: ButtonInteraction<CacheType>,
            ) {
                if (!i.deferred) await i.deferUpdate()
                    .catch((error) => {
                        log.error(`Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())# enquanto executava #(defaultOnCleanButtonClick())# para a question "#(${options.name})#" no Form "#(${this.name})#", aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(ButtonInteraction)#:', i, '\n#(CommandInteraction)#:', this.interaction);
                        throw error;
                    });



                if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

                /** Saves the user responde */
                this.questions.get(options.name)!.response = [];


                /** Updates the StringSelectMenu component */
                await this.interaction.editReply({
                    message: this.questionMessage,
                    content: formattedMessage,
                    components: [
                        rowSelectMenuFactory({
                            ...select,
                            options: select.options.map((option) => ({
                                ...option,
                                default: (this.questions.get(options.name)?.response as Returns[]).includes(option.value)
                            }))
                        }),
                        ...questionComponents.slice(1)
                    ]
                });


                this.emit('responseUpdate', this.questions.get(options.name)!);


                if (options.onClean) await options.onClean.bind(this)(this.questions.get(options.name)!);
                else if (options.onResponseUpdate) await options.onResponseUpdate.bind(this)(this.questions.get(options.name)!);


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

                if (select.placeholder) selectMenu.setPlaceholder(select.placeholder);


                /** Add options to select menu */
                selectMenu.addOptions(...select.options.map((data) => new StringSelectMenuOptionBuilder(data)));

                return new ActionRowBuilder<SelectMenuBuilder>()
                    .setComponents(selectMenu);
            }
        },

        async String<Req extends boolean>(
            this: Form,
            options: StringQuestionOptions<Req> /* {
            baseContent, confirmButtonCustomId, cleanButtonCustomId, canFix, confirmWithoutValueMessage, fixMessage, greaterThanTheMaximumLengthMessage,
            idle, required, lessThanTheMinimumLengthMessage, maxLength, minLength, cleanButtonLabel, onMessageCollect, onMessageClean, filter,
            onConfirm,
        }: {
            confirmButtonCustomId: string,
            baseContent: string,
            minLength?: number,
            maxLength?: number,
            idle?: number,
            canFix?: boolean,
            required?: Req,
            cleanButtonLabel?: string,
            lessThanTheMinimumLengthMessage?: string,
            greaterThanTheMaximumLengthMessage?: string,
            confirmWithoutValueMessage?: string,
            fixMessage?: string,
            filter?: (content: string, message: Message<boolean>, askMessage: Message<boolean>) => boolean | Promise<boolean>,
            onMessageCollect?: (content: string, message: Message<boolean>) => unknown,
            onConfirm?: (content: Req extends true ? string : (string | undefined)) => unknown,
            onMessageClean?: () => unknown,
        } & (Req extends true ? { cleanButtonCustomId?: undefined } : {
            cleanButtonCustomId: string,
        }) */) {
            options;
            return '' as string | undefined;
            // const definedMinLength = (minLength ?? 0);
            // const definedMaxLength = (maxLength ?? 2 ** 13);
            // const definedCleanButtonLabel = cleanButtonLabel ?? 'Limpar';
            // const definedBaseContent = required ? `\\* ${baseContent}` : `(opcional) ${baseContent}`;

            // let collectedMessage: string | undefined;

            // const askComponents = [];

            // if (!required) askComponents.push(rowCleanButtonFactory(cleanButtonCustomId!, definedCleanButtonLabel));

            // askComponents.push(rowConfirmButtonFactory(confirmButtonCustomId));

            // const ask = await interaction.followUp({
            //     content: definedBaseContent,
            //     ephemeral: true,
            //     components: askComponents
            // });


            // const messageCollector = ask.channel.createMessageCollector({
            //     filter: (m) => m.author.id === interaction.user.id,
            //     idle: idle ?? 30_000,
            //     max: canFix ? undefined : 1,
            // });


            // const buttonCollector = ask.createMessageComponentCollector({
            //     filter: defaultCollectorFilter,
            // });

            // collectors.push(messageCollector, buttonCollector);

            // messageCollector.on('collect', async (m) => {
            //     m.delete();

            //     if (m.content.length < definedMinLength) {
            //         interaction.editReply({
            //             message: ask,
            //             content: `${definedBaseContent} (${lessThanTheMinimumLengthMessage ?? `O mínimo de caracteres são ${definedMinLength}`})`,
            //         });
            //         return;
            //     }
            //     if (m.content.length > definedMaxLength) {
            //         interaction.editReply({
            //             message: ask,
            //             content: `${definedBaseContent} (${greaterThanTheMaximumLengthMessage ?? `O máximo de caracteres são ${definedMaxLength}`})`
            //         });
            //         return;
            //     }
            //     if (filter && !(await filter(m.content, m, ask))) return;

            //     collectedMessage = m.content;
            //     await onMessageCollect?.(collectedMessage, m);

            //     interaction.editReply({
            //         message: ask,
            //         content:
            //             `${definedBaseContent}${canFix ? ` (${fixMessage ?? 'Digite novamente se desejar alterar'})` : ''}\n` +
            //             `Valor digitado: \`${collectedMessage}\``
            //     });

            //     interaction.editReply(await bathroomPreviewMessageOptionsFactory());
            // });

            // messageCollector.on('end', (_collected, reason) => buttonCollector.stop(reason));

            // return await new Promise<Req extends true ? string : (string | undefined)>((resolve, reject) => {
            //     buttonCollector.on('collect', async (i) => {
            //         if (i.customId === confirmButtonCustomId) {
            //             if (required && !collectedMessage)
            //                 i.update({
            //                     content: `${definedBaseContent} (${confirmWithoutValueMessage ?? 'Você precisar digitar algo antes de confirmar'})`,
            //                 });
            //             else {
            //                 i.deferUpdate();
            //                 await onConfirm?.(collectedMessage as (Req extends true ? string : (string | undefined)));
            //                 messageCollector.stop('');
            //                 resolve(collectedMessage as (Req extends true ? string : (string | undefined)));
            //                 interaction.deleteReply(ask).catch(() => (0));
            //             };
            //         }

            //         else if (!required && i.customId === cleanButtonCustomId) {
            //             i.deferUpdate();

            //             collectedMessage = undefined;

            //             await onMessageClean?.();

            //             interaction.editReply({
            //                 message: ask,
            //                 content: definedBaseContent
            //             });

            //             interaction.editReply(await bathroomPreviewMessageOptionsFactory());
            //         }
            //     });

            //     buttonCollector.on('end', (_collected, reason) => {
            //         interaction.deleteReply(ask).catch(() => (0));
            //         if (reason) reject(reason);
            //     });
            // });
        },

        async Integer<Req extends boolean>(this: Form, options: IntegerQuestionOptions<Req>/* {
            min, max, lessThanTheMinimumMessage, greaterThanTheMaximumMessage, notAIntegerMessage, ...options
        }: Omit<Parameters<typeof askString<Req>>[0], 'filter' | 'onMessageCollect' | 'onConfirm'> & {
            min?: number,
            max?: number,
            lessThanTheMinimumMessage?: string,
            greaterThanTheMaximumMessage?: string,
            notAIntegerMessage?: string,
            filter?: (content: number, message: Message<boolean>, askMessage: Message<boolean>) => boolean | Promise<boolean>,
            onMessageCollect?: (content: number, message: Message<boolean>) => unknown,
            onConfirm?: (content: Req extends true ? number : (number | undefined)) => unknown,
        }*/) {
            options;
            return 0 as number | undefined;
            // const definedMin = (min ?? Number.MIN_SAFE_INTEGER);
            // const definedMax = (max ?? Number.MAX_SAFE_INTEGER);
            // const definedBaseContent = options.required ? `\\* ${options.baseContent}` : `(opcional) ${options.baseContent}`;

            // // @ts-ignore
            // const collectedIntegerString = await askString({
            //     ...options,
            //     filter: async (content, m, ask) => {
            //         if (!/^-?\d+$/g.test(content.trim())) {
            //             interaction.editReply({
            //                 message: ask,
            //                 content: `${definedBaseContent} (${notAIntegerMessage ?? 'Precisa ser um número inteiro!'})`
            //             });

            //             return false;
            //         }

            //         const numericalContent = Number(content.trim());

            //         if (numericalContent < definedMin) {
            //             interaction.editReply({
            //                 message: ask,
            //                 content: `${definedBaseContent} (${lessThanTheMinimumMessage ?? `O valor mínimo é ${definedMin}`})`
            //             });

            //             return false;
            //         }
            //         if (numericalContent > definedMax) {
            //             interaction.editReply({
            //                 message: ask,
            //                 content: `${definedBaseContent} (${greaterThanTheMaximumMessage ?? `O valor máximo é ${definedMax}`})`
            //             });

            //             return false;
            //         }


            //         return options.filter ? await options.filter?.(numericalContent, m, ask) : true;
            //     },
            //     onMessageCollect: (content, m) => options.onMessageCollect?.(Number(content), m),
            //     onConfirm: (content) => options.onConfirm?.((content !== undefined ? Number(content) : content as undefined) as Req extends true ? number : (number | undefined))
            // });

            // return (collectedIntegerString ? Number(collectedIntegerString) : undefined) as Req extends true ? number : (number | undefined);
        },

        async Boolean<Req extends boolean>(this: Form, options: BooleanQuestionOptions<Req>/* {
            truthyButton, falsyButton, confirmButtonCustomId, baseContent, idle, required, confirmWithoutSelectingMessage,
            undefinedButton, onSelect, onConfirm,
        }: {
            baseContent: string,
            confirmButtonCustomId: string,
            truthyButton: {
                customId: string,
                label?: string,
            }
            falsyButton: {
                customId: string,
                label?: string
            },
            idle?: number,
            required?: Req,
            confirmWithoutSelectingMessage?: string,
            onSelect?: (selected: Req extends true ? boolean : (boolean | undefined), interaction: ButtonInteraction<CacheType>) => unknown,
            onConfirm?: (selected: Req extends true ? boolean : (boolean | undefined)) => unknown,
        } & (Req extends true ? { undefinedButton?: undefined } : {
            undefinedButton: {
                customId: string,
                label?: string,
            }
        }) */) {
            options;
            return false as boolean | undefined;
            // const definedTruthyButtonLabel = truthyButton.label ?? 'Sim';
            // const definedFalsyButtonLabel = falsyButton.label ?? 'Não';
            // const definedUndefinedButtonLabel = undefinedButton?.label ?? 'Desmarcar';
            // const definedBaseContent = required ? `\\* ${baseContent}` : `(opcional) ${baseContent}`;

            // let selectedValue: boolean | undefined;

            // const ask = await interaction.followUp({
            //     content: definedBaseContent,
            //     ephemeral: true,
            //     components: [rowBooleanButtonsFactory(), rowConfirmButtonFactory(confirmButtonCustomId)]
            // });


            // const collector = ask.createMessageComponentCollector({
            //     filter: defaultCollectorFilter,
            //     idle: idle ?? 30_000,
            // });

            // collectors.push(collector);


            // return await new Promise<Req extends true ? boolean : (boolean | undefined)>((resolve, reject) => {
            //     collector.on('collect', async (i) => {
            //         if (!i.isButton()) return;

            //         if (i.customId === confirmButtonCustomId) {
            //             if (required && selectedValue === undefined) {
            //                 i.update(`${definedBaseContent} (${confirmWithoutSelectingMessage ?? 'Você precisa selecionar uma das opções primeiro!'})`);
            //                 return;
            //             }

            //             i.deferUpdate();
            //             await onConfirm?.(selectedValue as Req extends true ? boolean : (boolean | undefined));
            //             resolve(selectedValue as Req extends true ? boolean : (boolean | undefined));
            //             interaction.deleteReply(ask).catch(() => (0));
            //         }
            //         else if (
            //             [falsyButton.customId, truthyButton.customId].includes(i.customId) ||
            //             (required ? false : (undefinedButton!.customId === i.customId))
            //         ) {

            //             if (i.customId === truthyButton.customId) selectedValue = true;
            //             else if (i.customId === falsyButton.customId) selectedValue = false;
            //             else selectedValue = undefined;

            //             i.update({
            //                 content:
            //                     `${definedBaseContent}` +
            //                     (selectedValue !== undefined ?
            //                         `\n\`\`\`\n${selectedValue ? definedTruthyButtonLabel : definedFalsyButtonLabel}\n\`\`\`` :
            //                         '')
            //             });

            //             await onSelect?.(selectedValue as Req extends true ? boolean : (boolean | undefined), i);

            //             interaction.editReply(await bathroomPreviewMessageOptionsFactory());
            //         }
            //     });

            //     collector.on('end', (_collected, reason) => {
            //         interaction.deleteReply(ask).catch(() => (0));
            //         if (reason) reject(reason);
            //     });
            // });


            // function rowBooleanButtonsFactory() {
            //     const row = new ActionRowBuilder<ButtonBuilder>()
            //         .setComponents(
            //             new ButtonBuilder()
            //                 .setCustomId(falsyButton.customId)
            //                 .setStyle(ButtonStyle.Danger)
            //                 .setLabel(definedFalsyButtonLabel),
            //             new ButtonBuilder()
            //                 .setCustomId(truthyButton.customId)
            //                 .setStyle(ButtonStyle.Primary)
            //                 .setLabel(definedTruthyButtonLabel)
            //         );

            //     if (!required) row.addComponents(
            //         new ButtonBuilder()
            //             .setCustomId(undefinedButton!.customId)
            //             .setStyle(ButtonStyle.Secondary)
            //             .setLabel(definedUndefinedButtonLabel)
            //     );

            //     return row;
            // }
        },

        async Attachments<Req extends boolean>(options: AttachmentsQuestionOptions<Req>/* {
            baseContent, baseContentsByAttachment = [], confirmButtonCustomId, cleanButtonCustomId, canFix, confirmWithoutValuesMessage,
            fixMessage, greaterThanTheMaximumAttachmentsMessage, prevAttachmentButtonCustomId, nextAttachmentButtonCustomId,
            idle, lessThanTheMinimumAttachmentsMessage, maxAttachments, minAttachments, cleanButtonLabel,
            filter, onAttachmentClean, onAttachmentCollect, onConfirm
        }: {
            confirmButtonCustomId: string,
            baseContent: string,
            baseContentsByAttachment?: string[],
            minAttachments?: number,
            maxAttachments?: number,
            idle?: number,
            canFix?: boolean,
            cleanButtonLabel?: string,
            cleanButtonCustomId: string,
            lessThanTheMinimumAttachmentsMessage?: string,
            greaterThanTheMaximumAttachmentsMessage?: string,
            confirmWithoutValuesMessage?: string,
            fixMessage?: string,
            prevAttachmentButtonCustomId?: string,
            nextAttachmentButtonCustomId?: string,
            filter?: (attachment: Attachment, index: number, askMessage: Message<boolean>) => boolean | Promise<boolean>,
            onAttachmentCollect?: (attachment: Attachment, index: number, collected: Attachment[]) => unknown,
            onAttachmentClean?: (index: number, collected: Attachment[]) => unknown,
            onConfirm?: (collected: Req extends true ? Attachment[] : (Attachment[] | [])) => unknown
        } */) {
            options;
            return [new AttachmentBuilder(Buffer.from(''))] as unknown as (Attachment[] | []);
            // const definedMinAttachments = Math.max(minAttachments ?? 0, 0);
            // const definedMaxAttachments = Math.max(maxAttachments ?? 0, definedMinAttachments);
            // const definedCleanButtonLabel = cleanButtonLabel ?? 'Limpar';
            // const definedPrevAttachmentButtonCustomId = prevAttachmentButtonCustomId ?? 'prev-attachment-button-' + Date.now();
            // const definedNextAttachmentButtonCustomId = nextAttachmentButtonCustomId ?? 'next-attachment-button-' + Date.now();
            // const definedConfirmButtonCustomId = confirmButtonCustomId + '-' + Date.now();
            // const definedCleanButtonCustomId = cleanButtonCustomId + '-' + Date.now();

            // const collectedAttachments: Attachment[] = [];
            // let currentIndex = 0;

            // const askComponents: ActionRowBuilder<ButtonBuilder>[] = [];

            // if (definedMaxAttachments > 1) askComponents.push(rowAttachmentsPaginationFactory());

            // askComponents.push(
            //     rowCleanButtonFactory(definedCleanButtonCustomId, definedCleanButtonLabel),
            //     rowConfirmButtonFactory(definedConfirmButtonCustomId)
            // );

            // const ask = await interaction.followUp({
            //     content: getBaseContent(currentIndex),
            //     ephemeral: true,
            //     components: askComponents
            // });

            // const messageCollector = ask.channel.createMessageCollector({
            //     filter: (m) => m.author.id === interaction.user.id,
            //     idle: idle ?? 60_000,
            // });


            // const buttonCollector = ask.createMessageComponentCollector({
            //     filter: defaultCollectorFilter,
            // });

            // collectors.push(messageCollector, buttonCollector);

            // messageCollector.on('collect', async (m) => {
            //     if (!m.attachments.size) return;

            //     m.delete();

            //     if (m.attachments.size + Math.min(currentIndex, Math.max(collectedAttachments.length, 0)) > definedMaxAttachments) {
            //         interaction.editReply({
            //             message: ask,
            //             content: `${getBaseContent(currentIndex)} (${greaterThanTheMaximumAttachmentsMessage ?? `O máximo de arquivos são ${definedMaxAttachments}`})`
            //         });
            //         return;
            //     }

            //     if ((await Promise.all(m.attachments.toJSON().map(async (attachment, i) => {
            //         let dontPassOnFilter = false;

            //         if (filter && !(await filter(attachment, currentIndex + i, ask))) dontPassOnFilter = true;

            //         return dontPassOnFilter;
            //     }))).some((bool) => bool)) return;


            //     collectedAttachments.splice(currentIndex, m.attachments.size, ...m.attachments.toJSON());

            //     await Promise.all(
            //         m.attachments.toJSON().map(async (att, i) => await onAttachmentCollect?.(att, currentIndex + i, collectedAttachments))
            //     );

            //     interaction.editReply({
            //         message: ask,
            //         content:
            //             `${getBaseContent(currentIndex)}` +
            //             (collectedAttachments[currentIndex] ?
            //                 (
            //                     `${canFix ? ` (${fixMessage ?? 'Envie novamente se desejar alterar o arquivo'})` : ''}\n` +
            //                     `Arquivo: \`${collectedAttachments[currentIndex].name}\`\n` +
            //                     collectedAttachments[currentIndex].url
            //                 ) :
            //                 ''
            //             )
            //     });

            //     interaction.editReply(await bathroomPreviewMessageOptionsFactory());
            // });

            // messageCollector.on('end', (_collected, reason) => buttonCollector.stop(reason));

            // return await new Promise<Req extends true ? Attachment[] : (Attachment[] | [])>((resolve, reject) => {
            //     buttonCollector.on('collect', async (i) => {
            //         if (i.customId === definedConfirmButtonCustomId) {
            //             if (definedMinAttachments > 0 && !collectedAttachments.length) {
            //                 i.update({
            //                     content: `${getBaseContent(currentIndex)} (${confirmWithoutValuesMessage ?? 'Você precisar enviar algum arquivo antes de confirmar'})`,
            //                 });
            //                 return;
            //             } else if (collectedAttachments.length < definedMinAttachments) {
            //                 i.update({
            //                     content: `${getBaseContent(currentIndex)} (${lessThanTheMinimumAttachmentsMessage ?? `O número mínimo de arquivos é ${definedMaxAttachments}`})`
            //                 });
            //                 return;
            //             } else if (collectedAttachments.length > definedMaxAttachments) {
            //                 i.update({
            //                     content: `${getBaseContent(currentIndex)} (${greaterThanTheMaximumAttachmentsMessage ?? `O máximo de arquivos são ${definedMaxAttachments}`})`
            //                 });
            //                 return;
            //             }

            //             i.deferUpdate();
            //             await onConfirm?.(collectedAttachments);
            //             messageCollector.stop('');
            //             resolve(collectedAttachments as (Req extends true ? Attachment[] : (Attachment[] | [])));
            //             interaction.deleteReply(ask).catch(() => (0));
            //         }

            //         else if (i.customId === definedCleanButtonCustomId) {
            //             collectedAttachments.splice(currentIndex, 1);

            //             await onAttachmentClean?.(currentIndex, collectedAttachments);

            //             i.update({
            //                 content: `${getBaseContent(currentIndex)}` +
            //                     (collectedAttachments[currentIndex] ?
            //                         (
            //                             `${canFix ? ` (${fixMessage ?? 'Envie novamente se desejar alterar o arquivo'})` : ''}\n` +
            //                             `Arquivo: \`${collectedAttachments[currentIndex].name}\`\n` +
            //                             collectedAttachments[currentIndex].url
            //                         ) :
            //                         ''
            //                     )
            //             });

            //             interaction.editReply(await bathroomPreviewMessageOptionsFactory());
            //         }

            //         else if ([definedPrevAttachmentButtonCustomId, definedNextAttachmentButtonCustomId].includes(i.customId)) {
            //             if (i.customId === definedPrevAttachmentButtonCustomId) currentIndex--;
            //             else currentIndex++;

            //             askComponents.splice(0, 1, rowAttachmentsPaginationFactory());

            //             i.update({
            //                 content:
            //                     `${getBaseContent(currentIndex)}` +
            //                     (collectedAttachments[currentIndex] ?
            //                         (
            //                             `${canFix ? ` (${fixMessage ?? 'Envie novamente se desejar alterar o arquivo'})` : ''}\n` +
            //                             `Arquivo: \`${collectedAttachments[currentIndex].name}\`\n` +
            //                             collectedAttachments[currentIndex].url
            //                         ) :
            //                         ''
            //                     ),
            //                 components: askComponents
            //             });
            //         }
            //     });

            //     buttonCollector.on('end', (_collected, reason) => {
            //         interaction.deleteReply(ask).catch(() => (0));
            //         if (reason) reject(reason);
            //     });
            // });




            // function getBaseContent(index: number) {
            //     return `${definedMinAttachments > index ? '\\*' : '(opcional)'} ${baseContentsByAttachment[index] ?? baseContent}`;
            // }

            // function rowAttachmentsPaginationFactory() {
            //     return new ActionRowBuilder<ButtonBuilder>()
            //         .setComponents(
            //             new ButtonBuilder()
            //                 .setCustomId(definedPrevAttachmentButtonCustomId)
            //                 .setStyle(ButtonStyle.Secondary)
            //                 .setDisabled(currentIndex === 0)
            //                 .setLabel('<<'),
            //             new ButtonBuilder()
            //                 .setCustomId('current-attachment-page-button-' + Date.now())
            //                 .setDisabled()
            //                 .setStyle(ButtonStyle.Secondary)
            //                 .setLabel(`${currentIndex + 1}/${definedMaxAttachments}`),
            //             new ButtonBuilder()
            //                 .setCustomId(definedNextAttachmentButtonCustomId)
            //                 .setStyle(ButtonStyle.Secondary)
            //                 .setDisabled(currentIndex + 1 === definedMaxAttachments)
            //                 .setLabel('>>'),
            //         );
            // }
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
            options;
            response;
            return '' as string | undefined;
        },

        async Integer<Req extends boolean>(
            this: Form,
            options: IntegerQuestionOptions<Req>,
            response: Awaited<ReturnType<typeof this.askers.Integer<Req>>>
        ) {
            options;
            response;
            return '' as string | undefined;
        },

        async Boolean<Req extends boolean>(
            this: Form,
            options: BooleanQuestionOptions<Req>,
            response: Awaited<ReturnType<typeof this.askers.Boolean<Req>>>
        ) {
            options;
            response;
            return '' as string | undefined;
        },

        async Attachments<Req extends boolean>(
            this: Form,
            options: AttachmentsQuestionOptions<Req>,
            response: Awaited<ReturnType<typeof this.askers.Attachments<Req>>>
        ) {
            options;
            response;
            return '' as string | undefined;
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
            if (!i.deferred) await i.deferUpdate()
                .catch((error) => {
                    log.error(`Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())# enquanto executava #(defaultOnChangeQuestionButtonClick)# para a question "#(${options.name})#" no Form "#(${this.name})#", aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(ButtonInteraction)#:', i, '\n#(CommandInteraction)#:', this.interaction);
                    throw error;
                });



            if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

            const returns = this.questions.get(options.name)!.response as Awaited<ReturnType<Form['askers'][Type]>>;



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
            if (!i.deferred) await i.deferUpdate()
                .catch((error) => {
                    log.error(`Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())# enquanto executava #(defaultOnFinishFormButtonClick)# para a question "#(${options.name})#" no Form "#(${this.name})#", aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#), no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(ButtonInteraction)#:', i, '\n#(CommandInteraction)#:', this.interaction);
                    throw error;
                });


            if (!this.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);

            const returns = this.questions.get(options.name)!.response as Awaited<ReturnType<Form['askers'][Type]>>;


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
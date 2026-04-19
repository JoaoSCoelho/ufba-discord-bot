// File Version: 0.0.1

import { EventEmitter } from 'node:events';
import { INodeEventEmitter } from '../../../utils/INodeEventEmitter';
import { Attachment, ButtonInteraction, CacheType, CommandInteraction } from 'discord.js';
import Form from '../Form';
import { BaseQuestionOptions, ChangeQuestionAction, QuestionOptions } from '../Form.types';
import { log } from '../../LogSystem';
import BaseError from '../../../Errors/BaseError';

export type AskerResponse = string | string[] | boolean | Attachment[] | number | null | undefined;

export interface AskerEvents {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any[]
    responseUpdate: [response: AskerResponse],
    exit: [response: AskerResponse]
}

/** Base class for asker. 
 * An asker is a module that ask a question to the user, 
 * it is based on events to inform the user actions. */
export default abstract class Asker<
    Res extends AskerResponse
> extends (EventEmitter as unknown as { new(): INodeEventEmitter }) {
    /** `true` while the asker is capturing a response */
    protected running: boolean = false;
    /**  */
    public response: Res = undefined as Res;
    public abstract ask(options: BaseQuestionOptions): void | Promise<void>;

    public constructor(
        protected form: Form,
        protected interaction: CommandInteraction<CacheType>
    ) {
        super();
    }

    get isRunning(): boolean {
        return this.running;
    }



    // defaultsFunctions --------------------------------


    async onChangeQuestionButtonClick(
        this: this,
        action: ChangeQuestionAction,
        i: ButtonInteraction,
        options: QuestionOptions
    ) {
        if (!this.form.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);


        if (!i.deferred && !i.replied) await i.deferUpdate()
            .catch((error: unknown) => {
                log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                    'enquanto executava #(defaultOnChangeQuestionButtonClick)#',
                    `para a question "#(${options.name})#"`,
                    `no Form "#(${this.form.name})#",`,
                    `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                    `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                    '\n#(Erro)#:', error,
                    '\n#(ButtonInteraction)#:', i,
                    '\n#(CommandInteraction)#:', this.interaction
                );
                BaseError.handle(error);
                throw error;
            });



        const returns = this.form.questions.get(options.name)!.response as AskerResponse;



        this.form.changeQuestion(action);

        if (options.onChangeQuestion) await options.onChangeQuestion.bind(this.form)(action, i);


        this.emit('exit', returns);
        this.form.interactionCollector?.stop();
        this.running = false;

        return returns;
    };


    async onFinishFormButtonClick(
        this: this,
        i: ButtonInteraction<CacheType>,
        options: QuestionOptions
    ) {
        if (!this.form.questions.get(options.name)) throw new Error(`Don't exists a question with this name: "${options.name}"`);



        if (!i.deferred && !i.replied) await i.deferUpdate()
            .catch((error: unknown) => {
                log.error('Erro ao usar #i(ButtonInteraction<CacheType>)###(deferUpdate())#',
                    'enquanto executava #(defaultOnFinishFormButtonClick)#',
                    `para a question "#(${options.name})#"`,
                    `no Form "#(${this.form.name})#",`,
                    `aberto pelo usuário #(@${this.interaction.user.tag})# (#g(${this.interaction.user.id})#),`,
                    `no servidor #(${this.interaction.guild?.name ?? this.interaction.guildId ?? 'DM'})#.`,
                    '\n#(Erro)#:', error,
                    '\n#(ButtonInteraction)#:', i,
                    '\n#(CommandInteraction)#:', this.interaction
                );
                BaseError.handle(error);
                throw error;
            });




        const returns = this.form.questions.get(options.name)!.response as AskerResponse | undefined;


        this.form.finishForm();


        if (options.onFinishForm) await options.onFinishForm.bind(this.form)(i);

        this.emit('exit', returns);
        this.form.interactionCollector?.stop();
        this.running = false;

        return returns;
    }

    // Overwrite EventEmitter methods ----------------

    public on<Event extends keyof AskerEvents>(
        event: Event,
        listener: (...args: AskerEvents[Event]) => unknown,
    ): this;
    public on<Event extends string | symbol>(
        event: Exclude<Event, keyof AskerEvents>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (...args: any[]) => unknown,
    ): this { return super.on(event, listener); };

    public once<Event extends keyof AskerEvents>(
        event: Event,
        listener: (...args: AskerEvents[Event]) => unknown,
    ): this;
    public once<Event extends string | symbol>(
        event: Exclude<Event, keyof AskerEvents>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (...args: any[]) => unknown,
    ): this { return super.once(event, listener); };

    public emit<Event extends keyof AskerEvents>(event: Event, ...args: AskerEvents[Event]): boolean;
    public emit<Event extends string | symbol>(event: Exclude<Event, keyof AskerEvents>, ...args: unknown[]): boolean { return super.emit(event, ...args); };

    public off<Event extends keyof AskerEvents>(
        event: Event,
        listener: (...args: AskerEvents[Event]) => unknown,
    ): this;
    public off<Event extends string | symbol>(
        event: Exclude<Event, keyof AskerEvents>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (...args: any[]) => unknown,
    ): this { return super.off(event, listener); };

    public removeAllListeners<Event extends keyof AskerEvents>(event?: Event): this;
    public removeAllListeners<Event extends string | symbol>(event?: Exclude<Event, keyof AskerEvents>): this { return super.removeAllListeners(event); };
}
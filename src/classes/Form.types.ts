import { ButtonInteraction, CacheType, ChannelSelectMenuInteraction, Collection, MentionableSelectMenuInteraction, Message, RoleSelectMenuInteraction, SelectMenuComponentOptionData, StringSelectMenuInteraction, UserSelectMenuInteraction } from 'discord.js';
import Form from './Form';
import { TurnPartial } from '../utils/TurnPartial';

export type QuestionType = 'StringSelect' | 'String' | 'Integer' | 'Boolean' | 'Attachments'

export interface Question<Type extends QuestionType> {
    type: Type,
    options: Parameters<Form['askers'][Type]>[0],
    response: Awaited<ReturnType<Form['askers'][Type]>>
}

export interface QuestionStringSelect extends Question<'StringSelect'> { type: 'StringSelect' }
export interface ParamQuestionStringSelect extends TurnPartial<QuestionStringSelect, 'response'> { }

export interface QuestionString extends Question<'String'> { type: 'String' }
export interface ParamQuestionString extends TurnPartial<QuestionString, 'response'> { }

export interface QuestionInteger extends Question<'Integer'> { type: 'Integer' }
export interface ParamQuestionInteger extends TurnPartial<QuestionInteger, 'response'> { }

export interface QuestionBoolean extends Question<'Boolean'> { type: 'Boolean' }
export interface ParamQuestionBoolean extends TurnPartial<QuestionBoolean, 'response'> { }

export interface QuestionAttachments extends Question<'Attachments'> { type: 'Attachments' }
export interface ParamQuestionAttachments extends TurnPartial<QuestionAttachments, 'response'> { }


export type ComponentInteraction = StringSelectMenuInteraction<CacheType> | ButtonInteraction<CacheType> | UserSelectMenuInteraction<CacheType> | RoleSelectMenuInteraction<CacheType> | MentionableSelectMenuInteraction<CacheType> | ChannelSelectMenuInteraction<CacheType>




export interface BaseQuestionOptions<Req extends boolean, Type extends QuestionType> {
    name: string,
    
    nextQuestionButton?: Partial<BaseButtonDataOption> & {
        /** @default `next-question-button-${Date.now()}` */
        customId?: string,
        /** @default 'Próximo' */
        label?: string,
        /** Defines if the button should be displayed or not. @default true // if is the last question of array */
        hidden?: boolean,
    },
    prevQuestionButton?: Partial<BaseButtonDataOption> & {
        /** @default `prev-question-button-${Date.now()}` */
        customId?: string,
        /** @default 'Anterior' */
        label?: string,
        /** Defines if the button should be displayed or not. @default true // if is the first question of array */
        hidden?: boolean,
    },
    finishFormButton?: Partial<BaseButtonDataOption> & {
        /** @default `finish-form-button-${Date.now()}` */
        customId?: string,
        /** @default 'Finalizar' */
        label?: string,
        /** Defines if the button should be displayed or not. @default false */
        hidden?: boolean,
    }
    /** Clean inputed data button */
    cleanButton?: Partial<BaseButtonDataOption> & {
        /** @default 'Limpar' |
         *  'Desmarcar' // if is as select menu question */
        label?: string,
        /** @default `clean-button-${Date.now()}` */
        customId?: string,
        /** Defines if the button should be displayed or not. 
         * 
         * @default true // if cleanButton is undefined
         * false // Otherwise
         */
        hidden?: boolean
    }

    /** The command of the question. @example 'Escolha qual o seu Pokemon favorito dentre as opções abaixo!' | 'Digite seu nome completo' */
    message: string,
     /** Showed as a reply block in normal color below the `message` */
    infoMessage?: string,
    /** Showed as a code block in red color below the `message` */
    warnMessage?: string,
    /** Showed when the user try to finish form without a value to this question
     * @default 'Este é um campo obrigatório!'
     */
    requiredFieldMessage?: string

    /** Defines how long the question will stop receiving interactions after being idle */
    collectorIdle?: number,
    required?: Req,

    /** Array of filters that will be executed when the user try to finish the form
     * @returns a `string` that will be used as `warnMessage` or undefined if response pass on filter
     */
    onFinishFilters?: ((response: Awaited<ReturnType<Form['askers'][Type]>>) => Promise<string | undefined>)[]

    /** Executed when the user is trying to input a new value. 
     * @obs prevents the default action, use `onResponseUpdate` or `onChangeFilter` if you don't want it
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onChange?: (
        this: Form,
        ...args: [interaction: ComponentInteraction] | [message: Message]
    ) => Promise<Awaited<ReturnType<Form['askers'][Type]>> | null>
    /** Executed when the user is trying to input a new value. 
     * @obs not default executed if you are using `onChange`
     * @obs don't prevents the default action. Is executed inside `defaultOnChange()`, before set user input to response.
     * @returns `Promise<string>` if input don't pass on filter. The string is the message that will be showed to user.
     * 
     * `Promise<undefined>` if input pass on filter.
    */
    onChangeFilter?: (
        this: Form,
        ...args: [interaction: ComponentInteraction] | [message: Message]
    ) => Promise<string | undefined>
    /** Executed everytime this question change the response property 
     * @obs not default executed if you are using `onChange`
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onResponseUpdate?: (
        this: Form,
        question: Question<QuestionType>
    ) => Promise<unknown>,
    /** Executed when the "cleanButton" is clicked 
     * @obs prevents the default action, use `onClean` or `onResponseUpdate` if you don't want it
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onCleanButtonClick?: (
        this: Form,
        interaction: ButtonInteraction<CacheType>
    ) => Promise<Awaited<ReturnType<Form['askers'][Type]>> | null>,
    /** Executed when the question was cleared
     * @obs not default executed if you are using `onCleanButtonClick`
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onClean?: (
        this: Form,
        question: Question<QuestionType>
    ) => Promise<unknown>,
    /** Executed when the "prevQuestionButton" or "nextQuestionButton" is clicked 
     * @obs prevents the default action, use `onChangeQuestion` if you don't want it
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onChangeQuestionButtonClick?: (
        this: Form,
        action: 'advance' | 'goBack',
        interaction: ButtonInteraction<CacheType>
    ) => Promise<Awaited<ReturnType<Form['askers'][Type]>> | null>,
    /** Executed everytime current question is updated 
     * @obs not default executed if you are using `onChangeQuestionButtonClick`
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onChangeQuestion?: (
        this: Form,
        action: 'advance' | 'goBack',
        interaction: ButtonInteraction<CacheType>
    ) => Promise<unknown>,
    /** Executed when the "finishFormButton" is clicked 
     * @obs prevents the default action, use `onFinishForm` if you don't want it
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onFinishFormButtonClick?: (
        this: Form,
        interaction: ButtonInteraction<CacheType>
    ) => Promise<Awaited<ReturnType<Form['askers'][Type]>> | null>,
    /** Executed when the Form is finished in this question
     * @obs not default executed if you are using `onFinishFormButtonClick`
     * @returns `Promise<ReturnTypeOfQuestion>` // if want to resolve question
     * 
     * `PromiseRejection<{ rejectReason: string }>` // if want to reject question
     * 
     * `Promise<null>` // if want to bypass the question resolving
     */
    onFinishForm?: (
        this: Form,
        interaction: ButtonInteraction<CacheType>
    ) => Promise<unknown>,
}



export interface StringSelectQuestionOptions<Req extends boolean, Returns extends string> extends BaseQuestionOptions<Req, 'StringSelect'> {
    /** Updating documentation for props that are in BaseQuestionOptions ------------------------------------- */

    /** @default 30_000 // 30 seconds */
    collectorIdle?: BaseQuestionOptions<Req, 'StringSelect'>['collectorIdle'],

    /** Executed when the user select or unselect anything in select menu */
    onChange?: BaseQuestionOptions<Req, 'StringSelect'>['onChange'],

    /** ------------------------------------------------------------------------------------------------------ */




    /** Data of select menu component */
    select: Partial<StringSelectMenuData<Returns>> & {
        /** @default `string-select-${Date.now()}` */
        customId?: StringSelectMenuData<Returns>['customId'],
        placeholder?: StringSelectMenuData<Returns>['placeholder'],
        options: StringSelectMenuData<Returns>['options'],
        /** The max values that can be selected at the same time @default 1 */
        maxValues?: StringSelectMenuData<Returns>['maxValues'],
    },



    /** Showed when at least one value in response array is out of scope of select menu options
     * @default 'Opção selecionada fora do escopo de opções aceitas.'
     */
    outOfScopeMessage?: string
    /** @default 'Este é um campo obrigatório, você deve selecionar algum valor!' */
    requiredFieldMessage?: string


}

export interface StringQuestionOptions<Req extends boolean> extends BaseQuestionOptions<Req, 'String'> {
    /** Updating documentation for props that are in BaseQuestionOptions ------------------------------------- */

    /** @default 60_000 // 60 seconds */
    collectorIdle?: BaseQuestionOptions<Req, 'String'>['collectorIdle'],

    /** ------------------------------------------------------------------------------------------------------ */

    /** Defines the min length of content that the user can input. @default 0 */
    minLength?: number,
    /** Defines the max length of content that the user can input. @default 8192 // 2^13 */
    maxLength?: number,
    // /** Defines if the user can send another message to replace the first input @default true */
    // canFix?: boolean,
    /** This message will appear when the user try to input a text smaller than the minimum length. 
     * @default `Precisa ter um mínimo de ${minLength} caracteres`
     */
    lessThanTheMinimumLengthMessage?: string,
    /** This message will appear when the user try to input a text greater than the maximum length. 
     * @default `Precisa ter no máximo ${minLength} caracteres` 
     */
    greaterThanTheMaximumLengthMessage?: string,
    /** This message will appear after the user input the first response to the question.
     * @default 'Você pode substituir o valor atual enviando outra resposta.'
     */
    fixMessage?: string,
    /** This message will appear on the response field of the question on Discord when response is undefined 
     * @default '' 
     */
    placeholder?: string
}

export interface IntegerQuestionOptions<Req extends boolean> extends BaseQuestionOptions<Req, 'Integer'> {
    /** Updating documentation for props that are in BaseQuestionOptions ------------------------------------- */

    /** @default 60_000 // 60 seconds */
    collectorIdle?: BaseQuestionOptions<Req, 'Integer'>['collectorIdle'],

    /** ------------------------------------------------------------------------------------------------------ */

    /** Defines the min length of content that the user can input. @default 0 */
    minLength?: number,
    /** Defines the max length of content that the user can input. @default 8192 // 2^13 */
    maxLength?: number,
    // /** Defines if the user can send another message to replace the first input @default true */
    // canFix?: boolean,
    /** This message will appear when the user try to input a number smaller than the minimum length. 
     * @default `Precisa ter um mínimo de ${minLength} dígitos`
     */
    lessThanTheMinimumLengthMessage?: string,
    /** This message will appear when the user try to input a number greater than the maximum length. 
     * @default `Precisa ter no máximo ${minLength} dígitos` 
     */
    greaterThanTheMaximumLengthMessage?: string,
    /** This message will appear after the user input the first response to the question if `canFix` is `true`.
     * @default 'Você pode substituir o valor atual enviando outra resposta.'
     */
    fixMessage?: string,
    /** This message will appear on the response field of the question on Discord when response is undefined 
     * @default '' 
     */
    placeholder?: string

    /** Defines the min value that the user can input. @default Number.MIN_SAFE_INTEGER */
    min?: number,
    /** Defines the max value that the user can input. @default Number.MAX_SAFE_INTEGER */
    max?: number,
    /** This message will appear when the user try to input a number less than the minimum. 
     * @default `Valor mínimo: ${min}`
     */
    lessThanTheMinimumMessage?: string,
    /** This message will appear when the user try to input a number greater than the maximum. 
     * @default `Valor máximo: ${max}` 
     */
    greaterThanTheMaximumMessage?: string,
    /** This message will appear when the user try to input a text that is not a integer number.
     * @default 'Precisa ser um número inteiro!'
     */
    notAIntegerMessage?: string,
}

export interface AttachmentsQuestionOptions<Req extends boolean> extends BaseQuestionOptions<Req, 'Attachments'> {}

export interface BooleanQuestionOptions<Req extends boolean> extends BaseQuestionOptions<Req, 'Boolean'> {}





export type ChangeQuestionAction = 'goBack' | 'advance'




export interface BaseComponentData {
    customId: string
}

export interface SelectMenuOptionData<Value extends string> extends SelectMenuComponentOptionData {
    value: Value
}

export interface StringSelectMenuData<OptionValue extends string> extends BaseComponentData {
    placeholder?: string,
    options: SelectMenuOptionData<OptionValue>[],
    maxValues: number,
}

export interface BaseButtonData extends BaseComponentData {
    label: string,
    disabled?: boolean,
}

export interface BaseButtonDataOption extends Omit<BaseButtonData, 'disabled'> {
    hidden: boolean,
}

export interface FormEvents {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any[]
    responseUpdate: [question: Question<QuestionType>]
    changeQuestion: [currentQuestionIndex?: number, lastQuestionIndex?: number, action?: 'advance' | 'goBack']
    finishForm: [reason: string | undefined, responses: Collection<string, Awaited<ReturnType<Form['askers'][QuestionType]>>>]
}




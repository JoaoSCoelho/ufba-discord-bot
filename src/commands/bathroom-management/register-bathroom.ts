/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ActionRowBuilder, Attachment, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChannelSelectMenuInteraction, Collection, CollectorFilter, ComponentType, InteractionCollector, MappedInteractionTypes, MentionableSelectMenuInteraction, Message, MessageCollector, MessageComponentType, RoleSelectMenuInteraction, SelectMenuBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuInteraction } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusNames, CampusValues, GenderNames, GenderValues } from '../../classes/database/Bathroom';
import bathroomEmbedFactory from '../../shared/bathroomEmbedFactory';

const rateLimitOptions = { windowMs: 60_000, successfullyTimes: 3, times: 10 };
const limiter: Record<string, { lastUsage: number, times: number, successfullyTimes: number }> = {};

export default new Command(
    new SlashCommandBuilder()
        .setName('cadastrar-banheiro')
        .setDescription('Registra um novo banheiro.')
        .addStringOption(
            Command.commandOptions.bathroomManagement.campus()
                .setDescription('Escolha em qual campus está localizado este banheiro!')
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.institute()
                .setDescription('Em qual instituto da UFBA está localizado o banheiro?')
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.floor()
                .setDescription('Em que andar/piso do prédio está o banheiro? (0 para térreo) (valores negativos para subsolo)')
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.haveShower()
                .setDescription('Tem espaço para banhos neste banheiro?')
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.hasHandDryer()
                .setDescription('Tem secador de mãos neste banheiro?')
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.gender()
                .setDescription('Este é um banheiro Masculino, Feminino ou Unissex')
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.cabins()
                .setDescription('Quantas cabines tem neste banheiro?')
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.urinals()
                .setDescription('Quantos mictórios tem neste banheiro? (se aplicável)')
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.localization()
                .setDescription('Dê uma descrição de como chegar a este banheiro.')
        )
        .addAttachmentOption(
            Command.commandOptions.bathroomManagement.image()
                .setDescription('Uma imagem do banheiro.')
        ) as SlashCommandBuilder,



    async (interaction, client) => {
        if (!client.admins.includes(interaction.user.id) && !rateLimiter())
            return interaction.reply({
                content: `‼️ Você está criando muitos banheiros em um curto intervalo de tempo.\n⏳ Aguarde ${rateLimitOptions.windowMs / 1000} segundos e tente novamente!`,
                ephemeral: true,
            });



        const bathroomData = {
            campus: (interaction.options.get('campus')?.value ?? null) as CampusValues | null,
            floor: (interaction.options.get('andar')?.value ?? null) as number | null,
            haveShower: (interaction.options.get('tem-chuveiro')?.value ?? null) as boolean | null,
            hasHandDryer: (interaction.options.get('tem-secador-de-maos')?.value ?? null) as boolean | null,
            institute: (interaction.options.get('instituto')?.value ?? null) as string | null,
            gender: (interaction.options.get('genero')?.value ?? null) as GenderValues | null | undefined,
            cabins: (interaction.options.get('cabines')?.value ?? null) as number | null | undefined,
            urinals: (interaction.options.get('mictorios')?.value ?? null) as number | null | undefined,
            localization: (interaction.options.get('localizacao')?.value ?? null) as string | null | undefined,
            imagesUrls: interaction.options.get('imagem') ? [interaction.options.get('imagem')!.attachment!.url] : null,
            mainImageUrl: (interaction.options.get('imagem')?.attachment!.url ?? null) as string | null | undefined
        };

        const notFilledFields = Object.entries(bathroomData).filter(([key, value]) => {
            if (key === 'imagesUrls' || key === 'mainImageUrl') return true;
            return value === null;
        });

        const previewMessage = await interaction.reply(await bathroomPreviewMessageOptionsFactory());

        if (!await formController(notFilledFields.map(([key]) => key) as (keyof typeof bathroomData)[])) return;


        const bathroom = new Bathroom(
            {
                id: Date.now().toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: interaction.user.id,
                ...bathroomData as Omit<Bathroom, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
            }
        );

        await client.database?.bathroom.new(bathroom);

        !client.admins.includes(interaction.user.id) && limiter[interaction.user.id].successfullyTimes++;

        await interaction.editReply({
            embeds: [await bathroomEmbedFactory(client, {
                ...bathroom,
                avaliations: new Collection(),
            })],
            components: [],
        });

        await interaction.followUp({ content: 'Banheiro cadastrado com sucesso!', ephemeral: true });


        function defaultCollectorFilter(i: Parameters<CollectorFilter<[StringSelectMenuInteraction<CacheType> | UserSelectMenuInteraction<CacheType> | RoleSelectMenuInteraction<CacheType> | MentionableSelectMenuInteraction<CacheType> | ChannelSelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>]>>[0]) {
            return i.user.id === interaction.user.id;
        }

        function rateLimiter() {
            const userLimiter = limiter[interaction.user.id];

            if (!userLimiter) {
                limiter[interaction.user.id] = { lastUsage: Date.now(), times: 1, successfullyTimes: 0 };
                return true;
            }

            const userWindowMs = Date.now() - userLimiter.lastUsage;

            if (
                userWindowMs < rateLimitOptions.windowMs &&
                (userLimiter.times >= rateLimitOptions.times || userLimiter.successfullyTimes >= rateLimitOptions.successfullyTimes)
            )
                return false;
            else if (userWindowMs < rateLimitOptions.windowMs)
                limiter[interaction.user.id].times++;
            else if (userWindowMs > rateLimitOptions.windowMs) {
                limiter[interaction.user.id].times = 1;
                limiter[interaction.user.id].successfullyTimes = 0;
            }

            limiter[interaction.user.id].lastUsage = Date.now();

            return true;
        }

        async function formController(propNames: (keyof typeof bathroomData)[]) {
            const collectors: (InteractionCollector<MappedInteractionTypes[MessageComponentType]> | MessageCollector)[] = [];

            const previewMessageCollector = previewMessage.createMessageComponentCollector({ filter: defaultCollectorFilter });

            previewMessageCollector.on('collect', (i) => {
                if (i.customId === 'cancel-bathroom-register') {
                    i.deferUpdate();

                    collectors.forEach((collector) => collector.stop('canceled'));
                }
            });

            try {
                if (propNames.includes('campus')) await askCampusField();
                if (propNames.includes('institute')) await askInstituteField();
                if (propNames.includes('floor')) await askFloorField();
                if (propNames.includes('haveShower')) await askHaveShowerField();
                if (propNames.includes('hasHandDryer')) await askHasHandDryerField();
                if (propNames.includes('gender')) await askGenderField();
                if (propNames.includes('cabins')) await askCabinsField();
                if (propNames.includes('urinals')) await askUrinalsField();
                if (propNames.includes('localization')) await askLocalizationField();
                if (propNames.includes('imagesUrls')) await askImagesField();



                previewMessageCollector.stop();

                return true;
            } catch (err) {
                let reasonMessage: string = 'Banheiro não criado.';

                if (err === 'idle') reasonMessage += ' Formulário não completo!';
                if (err === 'canceled') reasonMessage += ' Cadastro cancelado!';

                interaction.editReply({
                    content: reasonMessage,
                    embeds: [],
                    components: []
                });
                return false;
            }


            async function askCampusField() {
                return (await askStringSelect({
                    select: {
                        customId: 'campus-select-menu',
                        options: [
                            { label: CampusNames['ONDINA'], value: 'ONDINA' },
                            { label: CampusNames['FEDERACAO'], value: 'FEDERACAO' },
                            { label: CampusNames['CAMACARI'], value: 'CAMACARI' },
                            { label: CampusNames['CANELA'], value: 'CANELA' },
                            { label: CampusNames['SAO_LAZARO'], value: 'SAO_LAZARO' },
                            { label: CampusNames['VITORIA'], value: 'VITORIA' }
                        ],
                        placeholder: 'Escolha um campus',
                    },
                    baseContent: 'Escolha em qual campus está localizado este banheiro!',
                    confirmButtonCustomId: 'campus-confirm-button',
                    confirmWithoutSelectingMessage: 'Você precisa escolher algum campus antes de confirmar!',
                    onSelect: onChange,
                    onConfirm: onChange,
                    required: true,
                }))[0];


                function onChange(selected: CampusValues[]) {
                    bathroomData.campus = selected[0];
                }
            }

            async function askInstituteField() {
                const instituteMinLength = Command.commandOptions.bathroomManagement.institute().min_length!;
                const instituteMaxLength = Command.commandOptions.bathroomManagement.institute().max_length!;

                return await askString({
                    baseContent: 'Digite abaixo qual o instituto onde este banheiro fica localizado',
                    confirmButtonCustomId: 'institute-confirm-button',
                    canFix: true,
                    confirmWithoutValueMessage: 'Você precisa digitar o nome do instituto antes de confirmar!',
                    fixMessage: 'Digite novamente se quiser alterar o instituto',
                    lessThanTheMinimumLengthMessage: `Instituto deve ter no mínimo ${instituteMinLength} caracteres!`,
                    greaterThanTheMaximumLengthMessage: `Instituto deve ter no máximo ${instituteMaxLength} caracteres!`,
                    maxLength: instituteMaxLength,
                    minLength: instituteMinLength,
                    required: true,
                    idle: 60_000,
                    onMessageCollect: onChange,
                    onConfirm: onChange,
                });


                function onChange(content: string) {
                    bathroomData.institute = content;
                }
            }

            async function askFloorField() {
                const minFloor = Command.commandOptions.bathroomManagement.floor().min_value!;
                const maxFloor = Command.commandOptions.bathroomManagement.floor().max_value!;

                return await askInteger({
                    baseContent: 'Digite abaixo em qual andar/piso está localizado este banheiro. (0 para térreo) (valores negativos para subsolo)',
                    confirmButtonCustomId: 'floor-confirm-button',
                    canFix: true,
                    confirmWithoutValueMessage: 'Você precisa digitar o andar/piso antes de confirmar',
                    fixMessage: 'Digite novamente se quiser alterar o andar/piso',
                    greaterThanTheMaximumMessage: `Seu prédio não é maior que o Burj Khalifa, então não exceda o limite de ${maxFloor} andares!`,
                    lessThanTheMinimumMessage: `A construção mais profunda do mundo é o DURF na China, com 2400m de profundidade. Não exceda o limite mínimo de ${minFloor} andares subterrâneos!`,
                    max: maxFloor,
                    min: minFloor,
                    required: true,
                    onMessageCollect: onChange,
                    onConfirm: onChange,
                });

                function onChange(content: number) {
                    bathroomData.floor = content;
                }
            }

            async function askHaveShowerField() {
                return await askBoolean({
                    baseContent: 'O banheiro tem chuveiro?',
                    confirmButtonCustomId: 'have-shower-confirm-button',
                    falsyButton: { customId: 'have-shower-falsy-button' },
                    truthyButton: { customId: 'have-shower-truthy-button' },
                    confirmWithoutSelectingMessage: 'Esta informação é necessária para cadastrar um banheiro!',
                    onSelect: onChange,
                    onConfirm: onChange,
                    required: true,
                });

                function onChange(selected: boolean) {
                    bathroomData.haveShower = selected;
                }
            }

            async function askHasHandDryerField() {
                return await askBoolean({
                    baseContent: 'Esse banheiro tem secador de mãos?',
                    confirmButtonCustomId: 'has-hand-dryer-confirm-button',
                    falsyButton: { customId: 'has-hand-dryer-falsy-button' },
                    truthyButton: { customId: 'has-hand-dryer-thuthy-button' },
                    onSelect: onChange,
                    onConfirm: onChange,
                    confirmWithoutSelectingMessage: 'Esta informação é necessária para cadastrar um banheiro!',
                    required: true,
                });

                function onChange(selected: boolean) {
                    bathroomData.hasHandDryer = selected;
                }
            }

            async function askGenderField() {
                return (await askStringSelect({
                    baseContent: 'Selecione para qual sexo é este banheiro.',
                    confirmButtonCustomId: 'gender-confirm-button',
                    select: {
                        customId: 'gender-select-menu',
                        options: [
                            { label: GenderNames['MASCULINO'], value: 'MASCULINO' },
                            { label: GenderNames['FEMININO'], value: 'FEMININO' },
                            { label: GenderNames['UNISSEX'], value: 'UNISSEX' },
                        ],
                        placeholder: 'Escolha o sexo'
                    },
                    onSelect: onChange,
                    onConfirm: onChange,
                }))[0];


                function onChange(selected: (GenderValues | undefined)[]) {
                    bathroomData.gender = selected[0];
                }
            }

            async function askCabinsField() {
                const minCabins = Command.commandOptions.bathroomManagement.cabins().min_value!;
                const maxCabins = Command.commandOptions.bathroomManagement.cabins().max_value!;

                return await askInteger({
                    baseContent: 'Digite abaixo quantas cabines tem o banheiro.',
                    confirmButtonCustomId: 'cabins-confirm-button',
                    canFix: true,
                    min: minCabins,
                    max: maxCabins,
                    onMessageCollect: onChange,
                    onConfirm: onChange,
                    onMessageClean: () => onChange(undefined),
                    greaterThanTheMaximumMessage: `Na UFBa não existe um banheiro com mais de ${maxCabins} cabines!`,
                    cleanButtonCustomId: 'cabins-clean-button'
                });

                function onChange(content: number | undefined) {
                    bathroomData.cabins = content;
                }
            }

            async function askUrinalsField() {
                const minUrinals = Command.commandOptions.bathroomManagement.urinals().min_value!;
                const maxUrinals = Command.commandOptions.bathroomManagement.urinals().max_value!;

                return await askInteger({
                    baseContent: 'Digite abaixo quantos mictórios tem o banheiro. (se aplicável)',
                    confirmButtonCustomId: 'urinals-confirm-button',
                    canFix: true,
                    min: minUrinals,
                    max: maxUrinals,
                    onMessageCollect: onChange,
                    onConfirm: onChange,
                    onMessageClean: () => onChange(undefined),
                    greaterThanTheMaximumMessage: `Na UFBa não existe um banheiro com mais de ${maxUrinals} mictórios!`,
                    cleanButtonCustomId: 'urinals-clean-button'
                });

                function onChange(content: number | undefined) {
                    bathroomData.urinals = content;
                }
            }

            async function askLocalizationField() {
                const localizationMaxLength = Command.commandOptions.bathroomManagement.localization().max_length!;
                const localizationMinLength = Command.commandOptions.bathroomManagement.localization().min_length!;

                return await askString({
                    baseContent: 'Digite abaixo uma descrição simples de como chegar ao banheiro.',
                    confirmButtonCustomId: 'localization-confirm-button',
                    canFix: true,
                    cleanButtonCustomId: 'localization-clean-button',
                    required: false,
                    fixMessage: 'Digite novamente se quiser alterar a localização',
                    greaterThanTheMaximumLengthMessage: `Tente resumir a descrição a no máximo ${localizationMaxLength} caracteres!`,
                    lessThanTheMinimumLengthMessage: `Escreva mais que ${localizationMinLength} caracteres! Você consegue fazer melhor!`,
                    maxLength: localizationMaxLength,
                    minLength: localizationMinLength,
                    idle: 60_000 * 5,
                    onMessageClean: () => onChange(undefined),
                    onMessageCollect: onChange,
                    onConfirm: onChange
                });

                function onChange(content: string | undefined) {
                    bathroomData.localization = content;
                }
            }

            async function askImagesField() {
                return askAttachments<false>({
                    baseContent: 'Envie abaixo imagens do banheiro',
                    baseContentsByAttachment: ['Envie abaixo imagens do banheiro\nℹ️ Esta imagem será definida como imagem principal.\n'],
                    cleanButtonCustomId: 'images-clean-button',
                    confirmButtonCustomId: 'images-confirm-button',
                    canFix: true,
                    idle: 60_000 * 5,
                    fixMessage: 'Envie outra imagem se desejar substituir a atual',
                    maxAttachments: Bathroom.imagesLimit,
                    onAttachmentCollect: (_att, _i, collected) => onChange(collected),
                    onAttachmentClean: (_i, collected) => onChange(collected),
                    onConfirm: onChange
                });

                function onChange(collected: Attachment[]) {
                    bathroomData.imagesUrls = collected.map((att) => att.url);
                    bathroomData.mainImageUrl = collected[0]?.url;
                }
            }


            // --------------------------------

            async function askStringSelect<ReturnType extends string, Req extends boolean>({
                select, baseContent, confirmButtonCustomId, confirmWithoutSelectingMessage, idle, onSelect, onConfirm, required, undefinedOption
            }: {
                select: {
                    customId: string,
                    placeholder: string,
                    options: { label: string, value: ReturnType, description?: string }[],
                    maxValues?: number,
                },
                confirmButtonCustomId: string,
                baseContent: string,
                idle?: number,
                onSelect?: (selected: ReturnType[], interaction: StringSelectMenuInteraction<CacheType>) => unknown,
                onConfirm?: (selected: ReturnType[]) => unknown,
                required?: Req,
                confirmWithoutSelectingMessage?: string,
                undefinedOption?: {
                    label?: string,
                    description?: string,
                }
            }) {
                const selectCustomId = select.customId;
                const definedUndefinedOptionLabel = undefinedOption?.label ?? 'Nenhum';
                const definedUndefinedOptionDescription = undefinedOption?.description ?? 'Desmarca qualquer opção previamente selecionada.';
                const undefinedOptionValue = '%%__UNDEFINED__%%';
                const definedBaseContent = required ? `\\* ${baseContent}` : `(opcional) ${baseContent}`;

                let selectedValues: ReturnType[] = [];

                const ask = await interaction.followUp({
                    content: definedBaseContent,
                    ephemeral: true,
                    components: [rowSelectMenuFactory(), rowConfirmButtonFactory(confirmButtonCustomId)]
                });

                const collector = ask.createMessageComponentCollector({
                    filter: defaultCollectorFilter,
                    idle: idle ?? 30_000,
                    
                });

                collectors.push(collector);

                return await new Promise<Req extends true ? ReturnType[] : (ReturnType[] | [undefined])>((resolve, reject) => {
                    collector.on('collect', async (i) => {
                        if (i.customId === selectCustomId && i.componentType === ComponentType.StringSelect) {
                            i.deferUpdate();

                            if (i.values.includes(undefinedOptionValue)) i.values = [];

                            selectedValues = i.values as ReturnType[];

                            await onSelect?.(selectedValues, i);

                            interaction.editReply(await bathroomPreviewMessageOptionsFactory());
                        } else if (i.customId === confirmButtonCustomId) {
                            if (required && !selectedValues.length)
                                i.update(`${definedBaseContent} (${confirmWithoutSelectingMessage ?? 'Selecione pelo menos um antes de confirmar!'})`);
                            else {
                                i.deferUpdate();
                                await onConfirm?.(selectedValues);
                                resolve(selectedValues as Req extends true ? ReturnType[] : (ReturnType[] | [undefined]));
                                interaction.deleteReply(ask).catch(() => (0));
                            };
                        }
                    });

                    collector.on('end', (_collected, reason) => {
                        interaction.deleteReply(ask).catch(() => (0));
                        if (reason) reject(reason);
                    });
                });




                function rowSelectMenuFactory() {
                    const selectMenu = new StringSelectMenuBuilder()
                        .setMaxValues(select.maxValues ?? 1)
                        .setCustomId(selectCustomId)
                        .setPlaceholder(select.placeholder);


                    if (!required) selectMenu
                        .addOptions({
                            label: definedUndefinedOptionLabel,
                            description: definedUndefinedOptionDescription,
                            value: undefinedOptionValue
                        });

                    selectMenu.addOptions(...select.options.map((data) => new StringSelectMenuOptionBuilder(data)));

                    return new ActionRowBuilder<SelectMenuBuilder>()
                        .setComponents(selectMenu);
                }
            }

            async function askString<Req extends boolean>({
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
            })) {
                const definedMinLength = (minLength ?? 0);
                const definedMaxLength = (maxLength ?? 2 ** 13);
                const definedCleanButtonLabel = cleanButtonLabel ?? 'Limpar';
                const definedBaseContent = required ? `\\* ${baseContent}` : `(opcional) ${baseContent}`;

                let collectedMessage: string | undefined;

                const askComponents = [];

                if (!required) askComponents.push(rowCleanButtonFactory(cleanButtonCustomId!, definedCleanButtonLabel));

                askComponents.push(rowConfirmButtonFactory(confirmButtonCustomId));

                const ask = await interaction.followUp({
                    content: definedBaseContent,
                    ephemeral: true,
                    components: askComponents
                });


                const messageCollector = ask.channel.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    idle: idle ?? 30_000,
                    max: canFix ? undefined : 1,
                });


                const buttonCollector = ask.createMessageComponentCollector({
                    filter: defaultCollectorFilter,
                });

                collectors.push(messageCollector, buttonCollector);

                messageCollector.on('collect', async (m) => {
                    m.delete();

                    if (m.content.length < definedMinLength) {
                        interaction.editReply({
                            message: ask,
                            content: `${definedBaseContent} (${lessThanTheMinimumLengthMessage ?? `O mínimo de caracteres são ${definedMinLength}`})`,
                        });
                        return;
                    }
                    if (m.content.length > definedMaxLength) {
                        interaction.editReply({
                            message: ask,
                            content: `${definedBaseContent} (${greaterThanTheMaximumLengthMessage ?? `O máximo de caracteres são ${definedMaxLength}`})`
                        });
                        return;
                    }
                    if (filter && !(await filter(m.content, m, ask))) return;

                    collectedMessage = m.content;
                    await onMessageCollect?.(collectedMessage, m);

                    interaction.editReply({
                        message: ask,
                        content:
                            `${definedBaseContent}${canFix ? ` (${fixMessage ?? 'Digite novamente se desejar alterar'})` : ''}\n` +
                            `Valor digitado: \`${collectedMessage}\``
                    });

                    interaction.editReply(await bathroomPreviewMessageOptionsFactory());
                });

                messageCollector.on('end', (_collected, reason) => buttonCollector.stop(reason));

                return await new Promise<Req extends true ? string : (string | undefined)>((resolve, reject) => {
                    buttonCollector.on('collect', async (i) => {
                        if (i.customId === confirmButtonCustomId) {
                            if (required && !collectedMessage)
                                i.update({
                                    content: `${definedBaseContent} (${confirmWithoutValueMessage ?? 'Você precisar digitar algo antes de confirmar'})`,
                                });
                            else {
                                i.deferUpdate();
                                await onConfirm?.(collectedMessage as (Req extends true ? string : (string | undefined)));
                                messageCollector.stop('');
                                resolve(collectedMessage as (Req extends true ? string : (string | undefined)));
                                interaction.deleteReply(ask).catch(() => (0));
                            };
                        }

                        else if (!required && i.customId === cleanButtonCustomId) {
                            i.deferUpdate();

                            collectedMessage = undefined;

                            await onMessageClean?.();

                            interaction.editReply({
                                message: ask,
                                content: definedBaseContent
                            });

                            interaction.editReply(await bathroomPreviewMessageOptionsFactory());
                        }
                    });

                    buttonCollector.on('end', (_collected, reason) => {
                        interaction.deleteReply(ask).catch(() => (0));
                        if (reason) reject(reason);
                    });
                });
            }

            async function askInteger<Req extends boolean>({
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
            }) {
                const definedMin = (min ?? Number.MIN_SAFE_INTEGER);
                const definedMax = (max ?? Number.MAX_SAFE_INTEGER);
                const definedBaseContent = options.required ? `\\* ${options.baseContent}` : `(opcional) ${options.baseContent}`;

                // @ts-ignore
                const collectedIntegerString = await askString({
                    ...options,
                    filter: async (content, m, ask) => {
                        if (!/^-?\d+$/g.test(content.trim())) {
                            interaction.editReply({
                                message: ask,
                                content: `${definedBaseContent} (${notAIntegerMessage ?? 'Precisa ser um número inteiro!'})`
                            });

                            return false;
                        }

                        const numericalContent = Number(content.trim());

                        if (numericalContent < definedMin) {
                            interaction.editReply({
                                message: ask,
                                content: `${definedBaseContent} (${lessThanTheMinimumMessage ?? `O valor mínimo é ${definedMin}`})`
                            });

                            return false;
                        }
                        if (numericalContent > definedMax) {
                            interaction.editReply({
                                message: ask,
                                content: `${definedBaseContent} (${greaterThanTheMaximumMessage ?? `O valor máximo é ${definedMax}`})`
                            });

                            return false;
                        }


                        return options.filter ? await options.filter?.(numericalContent, m, ask) : true;
                    },
                    onMessageCollect: (content, m) => options.onMessageCollect?.(Number(content), m),
                    onConfirm: (content) => options.onConfirm?.((content !== undefined ? Number(content) : content as undefined) as Req extends true ? number : (number | undefined))
                });

                return (collectedIntegerString ? Number(collectedIntegerString) : undefined) as Req extends true ? number : (number | undefined);
            }

            async function askBoolean<Req extends boolean>({
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
            })) {
                const definedTruthyButtonLabel = truthyButton.label ?? 'Sim';
                const definedFalsyButtonLabel = falsyButton.label ?? 'Não';
                const definedUndefinedButtonLabel = undefinedButton?.label ?? 'Desmarcar';
                const definedBaseContent = required ? `\\* ${baseContent}` : `(opcional) ${baseContent}`;

                let selectedValue: boolean | undefined;

                const ask = await interaction.followUp({
                    content: definedBaseContent,
                    ephemeral: true,
                    components: [rowBooleanButtonsFactory(), rowConfirmButtonFactory(confirmButtonCustomId)]
                });


                const collector = ask.createMessageComponentCollector({
                    filter: defaultCollectorFilter,
                    idle: idle ?? 30_000,
                });

                collectors.push(collector);


                return await new Promise<Req extends true ? boolean : (boolean | undefined)>((resolve, reject) => {
                    collector.on('collect', async (i) => {
                        if (!i.isButton()) return;

                        if (i.customId === confirmButtonCustomId) {
                            if (required && selectedValue === undefined) {
                                i.update(`${definedBaseContent} (${confirmWithoutSelectingMessage ?? 'Você precisa selecionar uma das opções primeiro!'})`);
                                return;
                            }

                            i.deferUpdate();
                            await onConfirm?.(selectedValue as Req extends true ? boolean : (boolean | undefined));
                            resolve(selectedValue as Req extends true ? boolean : (boolean | undefined));
                            interaction.deleteReply(ask).catch(() => (0));
                        }
                        else if (
                            [falsyButton.customId, truthyButton.customId].includes(i.customId) ||
                            (required ? false : (undefinedButton!.customId === i.customId))
                        ) {

                            if (i.customId === truthyButton.customId) selectedValue = true;
                            else if (i.customId === falsyButton.customId) selectedValue = false;
                            else selectedValue = undefined;

                            i.update({
                                content:
                                    `${definedBaseContent}` +
                                    (selectedValue !== undefined ?
                                        `\n\`\`\`\n${selectedValue ? definedTruthyButtonLabel : definedFalsyButtonLabel}\n\`\`\`` :
                                        '')
                            });

                            await onSelect?.(selectedValue as Req extends true ? boolean : (boolean | undefined), i);

                            interaction.editReply(await bathroomPreviewMessageOptionsFactory());
                        }
                    });

                    collector.on('end', (_collected, reason) => {
                        interaction.deleteReply(ask).catch(() => (0));
                        if (reason) reject(reason);
                    });
                });


                function rowBooleanButtonsFactory() {
                    const row = new ActionRowBuilder<ButtonBuilder>()
                        .setComponents(
                            new ButtonBuilder()
                                .setCustomId(falsyButton.customId)
                                .setStyle(ButtonStyle.Danger)
                                .setLabel(definedFalsyButtonLabel),
                            new ButtonBuilder()
                                .setCustomId(truthyButton.customId)
                                .setStyle(ButtonStyle.Primary)
                                .setLabel(definedTruthyButtonLabel)
                        );

                    if (!required) row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(undefinedButton!.customId)
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(definedUndefinedButtonLabel)
                    );

                    return row;
                }
            }

            async function askAttachments<Req extends boolean>({
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
            }) {
                const definedMinAttachments = Math.max(minAttachments ?? 0, 0);
                const definedMaxAttachments = Math.max(maxAttachments ?? 0, definedMinAttachments);
                const definedCleanButtonLabel = cleanButtonLabel ?? 'Limpar';
                const definedPrevAttachmentButtonCustomId = prevAttachmentButtonCustomId ?? 'prev-attachment-button-' + Date.now();
                const definedNextAttachmentButtonCustomId = nextAttachmentButtonCustomId ?? 'next-attachment-button-' + Date.now();
                const definedConfirmButtonCustomId = confirmButtonCustomId + '-' + Date.now();
                const definedCleanButtonCustomId = cleanButtonCustomId + '-' + Date.now();

                const collectedAttachments: Attachment[] = [];
                let currentIndex = 0;

                const askComponents: ActionRowBuilder<ButtonBuilder>[] = [];

                if (definedMaxAttachments > 1) askComponents.push(rowAttachmentsPaginationFactory());

                askComponents.push(
                    rowCleanButtonFactory(definedCleanButtonCustomId, definedCleanButtonLabel),
                    rowConfirmButtonFactory(definedConfirmButtonCustomId)
                );

                const ask = await interaction.followUp({
                    content: getBaseContent(currentIndex),
                    ephemeral: true,
                    components: askComponents
                });

                const messageCollector = ask.channel.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    idle: idle ?? 60_000,
                });


                const buttonCollector = ask.createMessageComponentCollector({
                    filter: defaultCollectorFilter,
                });

                collectors.push(messageCollector, buttonCollector);

                messageCollector.on('collect', async (m) => {
                    if (!m.attachments.size) return;

                    m.delete();
                    
                    if (m.attachments.size + Math.min(currentIndex, Math.max(collectedAttachments.length, 0)) > definedMaxAttachments) {
                        interaction.editReply({
                            message: ask,
                            content: `${getBaseContent(currentIndex)} (${greaterThanTheMaximumAttachmentsMessage ?? `O máximo de arquivos são ${definedMaxAttachments}`})`
                        });
                        return;
                    }

                    if ((await Promise.all(m.attachments.toJSON().map(async (attachment, i) => {
                        let dontPassOnFilter = false;

                        if (filter && !(await filter(attachment, currentIndex + i, ask))) dontPassOnFilter = true;

                        return dontPassOnFilter;
                    }))).some((bool) => bool)) return;


                    collectedAttachments.splice(currentIndex, m.attachments.size, ...m.attachments.toJSON());

                    await Promise.all(
                        m.attachments.toJSON().map(async (att, i) => await onAttachmentCollect?.(att, currentIndex + i, collectedAttachments))
                    );
                    
                    interaction.editReply({
                        message: ask,
                        content:
                            `${getBaseContent(currentIndex)}` +
                            (collectedAttachments[currentIndex] ?
                                (
                                    `${canFix ? ` (${fixMessage ?? 'Envie novamente se desejar alterar o arquivo'})` : ''}\n` +
                                    `Arquivo: \`${collectedAttachments[currentIndex].name}\`\n` +
                                    collectedAttachments[currentIndex].url
                                ) :
                                ''
                            )
                    });

                    interaction.editReply(await bathroomPreviewMessageOptionsFactory());
                });

                messageCollector.on('end', (_collected, reason) => buttonCollector.stop(reason));

                return await new Promise<Req extends true ? Attachment[] : (Attachment[] | [])>((resolve, reject) => {
                    buttonCollector.on('collect', async (i) => {
                        if (i.customId === definedConfirmButtonCustomId) {
                            if (definedMinAttachments > 0 && !collectedAttachments.length) {
                                i.update({
                                    content: `${getBaseContent(currentIndex)} (${confirmWithoutValuesMessage ?? 'Você precisar enviar algum arquivo antes de confirmar'})`,
                                });
                                return;
                            } else if (collectedAttachments.length < definedMinAttachments) {
                                i.update({
                                    content: `${getBaseContent(currentIndex)} (${lessThanTheMinimumAttachmentsMessage ?? `O número mínimo de arquivos é ${definedMaxAttachments}`})`
                                });
                                return;
                            } else if (collectedAttachments.length > definedMaxAttachments) {
                                i.update({
                                    content: `${getBaseContent(currentIndex)} (${greaterThanTheMaximumAttachmentsMessage ?? `O máximo de arquivos são ${definedMaxAttachments}`})`
                                });
                                return;
                            }

                            i.deferUpdate();
                            await onConfirm?.(collectedAttachments);
                            messageCollector.stop('');
                            resolve(collectedAttachments as (Req extends true ? Attachment[] : (Attachment[] | [])));
                            interaction.deleteReply(ask).catch(() => (0));
                        }

                        else if (i.customId === definedCleanButtonCustomId) {
                            collectedAttachments.splice(currentIndex, 1);

                            await onAttachmentClean?.(currentIndex, collectedAttachments);

                            i.update({
                                content: `${getBaseContent(currentIndex)}` +
                                    (collectedAttachments[currentIndex] ?
                                        (
                                            `${canFix ? ` (${fixMessage ?? 'Envie novamente se desejar alterar o arquivo'})` : ''}\n` +
                                            `Arquivo: \`${collectedAttachments[currentIndex].name}\`\n` +
                                            collectedAttachments[currentIndex].url
                                        ) :
                                        ''
                                    )
                            });

                            interaction.editReply(await bathroomPreviewMessageOptionsFactory());
                        }

                        else if ([definedPrevAttachmentButtonCustomId, definedNextAttachmentButtonCustomId].includes(i.customId)) {
                            if (i.customId === definedPrevAttachmentButtonCustomId) currentIndex--;
                            else currentIndex++;

                            askComponents.splice(0, 1, rowAttachmentsPaginationFactory());

                            i.update({
                                content:
                                    `${getBaseContent(currentIndex)}` +
                                    (collectedAttachments[currentIndex] ?
                                        (
                                            `${canFix ? ` (${fixMessage ?? 'Envie novamente se desejar alterar o arquivo'})` : ''}\n` +
                                            `Arquivo: \`${collectedAttachments[currentIndex].name}\`\n` +
                                            collectedAttachments[currentIndex].url
                                        ) :
                                        ''
                                    ),
                                components: askComponents
                            });
                        }
                    });

                    buttonCollector.on('end', (_collected, reason) => {
                        interaction.deleteReply(ask).catch(() => (0));
                        if (reason) reject(reason);
                    });
                });




                function getBaseContent(index: number) {
                    return `${definedMinAttachments > index ? '\\*' : '(opcional)'} ${baseContentsByAttachment[index] ?? baseContent}`;
                }

                function rowAttachmentsPaginationFactory() {
                    return new ActionRowBuilder<ButtonBuilder>()
                        .setComponents(
                            new ButtonBuilder()
                                .setCustomId(definedPrevAttachmentButtonCustomId)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentIndex === 0)
                                .setLabel('<<'),
                            new ButtonBuilder()
                                .setCustomId('current-attachment-page-button-' + Date.now())
                                .setDisabled()
                                .setStyle(ButtonStyle.Secondary)
                                .setLabel(`${currentIndex + 1}/${definedMaxAttachments}`),
                            new ButtonBuilder()
                                .setCustomId(definedNextAttachmentButtonCustomId)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentIndex + 1 === definedMaxAttachments)
                                .setLabel('>>'),
                        );
                }
            }
        }



        function rowConfirmButtonFactory(buttonCustomId: string) {
            return new ActionRowBuilder<ButtonBuilder>()
                .setComponents(
                    confirmButtonFactory(buttonCustomId)
                );
        }

        function rowCleanButtonFactory(customId: string, label: string) {
            return new ActionRowBuilder<ButtonBuilder>()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel(label)
                        .setStyle(ButtonStyle.Secondary)
                );
        }

        function confirmButtonFactory(customId: string) {
            return new ButtonBuilder()
                .setCustomId(customId)
                .setStyle(ButtonStyle.Success)
                .setLabel('Confirmar');
        }

        async function bathroomPreviewMessageOptionsFactory() {
            return {
                embeds: [await bathroomEmbedFactory(client, {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: interaction.user.id,
                    avaliations: new Collection(),
                    id: null,
                    ...bathroomData
                })],
                components: [rowCancelBathroomRegister()],
                ephemeral: true
            };


            function rowCancelBathroomRegister() {
                return new ActionRowBuilder<ButtonBuilder>()
                    .setComponents(
                        new ButtonBuilder()
                            .setCustomId('cancel-bathroom-register')
                            .setLabel('Cancelar cadastro')
                            .setStyle(ButtonStyle.Danger)
                    );
            }
        }
    }
);
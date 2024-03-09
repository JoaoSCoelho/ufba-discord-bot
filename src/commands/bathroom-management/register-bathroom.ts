/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ActionRowBuilder, Attachment, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChannelSelectMenuInteraction, Collection, CollectorFilter, MentionableSelectMenuInteraction, RoleSelectMenuInteraction, SlashCommandBuilder, StringSelectMenuInteraction, UserSelectMenuInteraction } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusNames, CampusValues, GenderNames, GenderValues } from '../../classes/database/Bathroom';
import bathroomEmbedFactory from '../../shared/bathroomEmbedFactory';
import Form from '../../classes/Form';
import { Question } from '../../classes/Form.types';
import isObject from '../../utils/isObject';
import { log } from '../../classes/LogSystem';

// [TODO]: DOCUMENTAR ESSE COMANDO

const rateLimitOptions = { 
    windowMs: 60_000, 
    successfullyTimes: 3,
    times: 10
};
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
        await interaction.deferReply({ ephemeral: true })
            .catch((error) => {
                log.error(`Erro ao usar #i(CommandInteraction<CacheType>)###(deferReply())# enquanto executava o comando #(${interaction.commandName})# aberto pelo usuário #(@${interaction.user.tag})# (#g(${interaction.user.id})#), no servidor #(${interaction.guild?.name ?? interaction.guildId ?? 'DM'})#.\n#(Erro)#:`, error, '\n#(CommandInteraction)#:', interaction);
                throw error;
            });


        if (!client.admins.includes(interaction.user.id) && !rateLimiter())
            return interaction.reply({
                content: `‼️ Você está criando muitos banheiros em um curto intervalo de tempo.\n⏳ Aguarde ${rateLimitOptions.windowMs / 1000} segundos e tente novamente!`,
                ephemeral: true,
            });
            // FAZER ESSE CATCH



        let bathroomData = {
            campus: (interaction.options.get('campus')?.value ?? null) as CampusValues | null,
            institute: (interaction.options.get('instituto')?.value ?? null) as string | null,
            floor: (interaction.options.get('andar')?.value ?? null) as number | null,
            haveShower: (interaction.options.get('tem-chuveiro')?.value ?? null) as boolean | null,
            hasHandDryer: (interaction.options.get('tem-secador-de-maos')?.value ?? null) as boolean | null,
            gender: (interaction.options.get('genero')?.value ?? null) as GenderValues | null | undefined,
            cabins: (interaction.options.get('cabines')?.value ?? null) as number | null | undefined,
            urinals: (interaction.options.get('mictorios')?.value ?? null) as number | null | undefined,
            localization: (interaction.options.get('localizacao')?.value ?? null) as string | null | undefined,
            mainImageUrl: (interaction.options.get('imagem')?.attachment!.url ?? null) as string | null | undefined,
            imagesUrls: interaction.options.get('imagem') ? [interaction.options.get('imagem')!.attachment!.url] : null,
        };

        const [firstNotFilledField] = Object.entries(bathroomData).find(([key, value]) => {
            if (key === 'imagesUrls' || key === 'mainImageUrl') return true;
            return value === null;
        })!;

        const previewMessage = await interaction.followUp(await bathroomPreviewMessageOptionsFactory());

        const form = new Form(
            'register-bathroom-' + Date.now(),
            interaction,
            client,
            [
                {
                    type: 'StringSelect',
                    response: bathroomData.campus ? [bathroomData.campus] : undefined,
                    options: {
                        message: 'Escolha em qual campus está localizado este banheiro.',
                        name: 'campus',
                        select: {
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
                        requiredFieldMessage: 'Você precisa escolher algum campus antes de finalizar!',
                        required: true,
                        finishFormButton: { hidden: true },
                    }
                },
                {
                    type: 'String',
                    response: bathroomData.institute ?? undefined,
                    options: {
                        name: 'institute',
                        message: 'Digite abaixo qual o instituto onde este banheiro fica localizado',
                        requiredFieldMessage: 'Você precisa digitar o nome do instituto antes de finalizar!',
                        fixMessage: 'Você pode substituir o instituto digitado, enviando outra resposta.',
                        lessThanTheMinimumLengthMessage: `Instituto deve ter no mínimo ${Command.commandOptions.bathroomManagement.institute().min_length!} caracteres!`,
                        greaterThanTheMaximumLengthMessage: `Instituto deve ter no máximo ${Command.commandOptions.bathroomManagement.institute().max_length!} caracteres!`,
                        maxLength: Command.commandOptions.bathroomManagement.institute().max_length!,
                        minLength: Command.commandOptions.bathroomManagement.institute().min_length!,
                        required: true,
                        finishFormButton: { hidden: true }
                    }
                },
                {
                    type: 'Integer',
                    response: bathroomData.floor ?? undefined,
                    options: {
                        message: 'Digite abaixo em qual andar/piso está localizado este banheiro.\n> **(0 para térreo) (valores negativos para subsolo)**',
                        name: 'floor',
                        requiredFieldMessage: 'Você precisa digitar o andar/piso antes de finalizar',
                        fixMessage: 'Você pode substituir o andar/piso digitado, enviando outra resposta.',
                        greaterThanTheMaximumMessage: `Seu prédio não é maior que o Burj Khalifa, então não exceda o limite de ${Command.commandOptions.bathroomManagement.floor().max_value!} andares!`,
                        lessThanTheMinimumMessage: `A construção mais profunda do mundo é o DURF na China, com 2400m de profundidade. Não exceda o limite mínimo de ${Command.commandOptions.bathroomManagement.floor().min_value!} andares subterrâneos!`,
                        max: Command.commandOptions.bathroomManagement.floor().max_value!,
                        min: Command.commandOptions.bathroomManagement.floor().min_value!,
                        required: true,
                        finishFormButton: { hidden: true }
                    }
                },
                {
                    type: 'Boolean',
                    response: bathroomData.haveShower ?? undefined,
                    options: {
                        message: 'O banheiro tem chuveiro?',
                        name: 'haveShower',
                        required: true,
                        finishFormButton: { hidden: true }
                    }
                },
                {
                    type: 'Boolean',
                    response: bathroomData.hasHandDryer ?? undefined,
                    options: {
                        message: 'Esse banheiro tem secador de mãos?',
                        name: 'hasHandDryer',
                        required: true,
                    }
                },
                {
                    type: 'StringSelect',
                    response: bathroomData.gender ? [bathroomData.gender] : undefined,
                    options: {
                        message: 'Selecione para qual sexo é este banheiro.',
                        name: 'gender',
                        select: {
                            options: [
                                { label: GenderNames['MASCULINO'], value: 'MASCULINO' },
                                { label: GenderNames['FEMININO'], value: 'FEMININO' },
                                { label: GenderNames['UNISSEX'], value: 'UNISSEX' },
                            ],
                            placeholder: 'Escolha o sexo'
                        },
                        cleanButton: {},
                    }
                },
                {
                    type: 'Integer',
                    response: bathroomData.cabins ?? undefined,
                    options: {
                        name: 'cabins',
                        message: 'Digite abaixo quantas cabines tem o banheiro.',
                        min: Command.commandOptions.bathroomManagement.cabins().min_value!,
                        max: Command.commandOptions.bathroomManagement.cabins().max_value!,
                        greaterThanTheMaximumMessage: `Na UFBa não existe um banheiro com mais de ${Command.commandOptions.bathroomManagement.cabins().max_value!} cabines!`,
                        cleanButton: {},
                    }
                },
                {
                    type: 'Integer',
                    response: bathroomData.urinals ?? undefined,
                    options: {
                        message: 'Digite abaixo quantos mictórios tem o banheiro.\n> **(se aplicável)**',
                        name: 'urinals',
                        min: Command.commandOptions.bathroomManagement.urinals().min_value!,
                        max: Command.commandOptions.bathroomManagement.urinals().max_value!,
                        greaterThanTheMaximumMessage: `Na UFBa não existe um banheiro com mais de ${Command.commandOptions.bathroomManagement.urinals().max_value!} mictórios!`,
                        cleanButton: {},
                    }
                },
                {
                    type: 'String',
                    response: bathroomData.localization ?? undefined,
                    options: {
                        message: 'Digite abaixo uma descrição simples de como chegar ao banheiro.',
                        name: 'localization',
                        fixMessage: 'Você pode substituir a localização digitada, enviando outra resposta.',
                        greaterThanTheMaximumLengthMessage: `Tente resumir a descrição a no máximo ${Command.commandOptions.bathroomManagement.localization().max_length!} caracteres!`,
                        lessThanTheMinimumLengthMessage: `Escreva mais que ${Command.commandOptions.bathroomManagement.localization().min_length!} caracteres! Você consegue fazer melhor!`,
                        maxLength: Command.commandOptions.bathroomManagement.localization().max_length!,
                        minLength: Command.commandOptions.bathroomManagement.localization().min_length!,
                        collectorIdle: 60_000 * 5, // 5 minutes
                        cleanButton: {}
                    }
                },
                {
                    type: 'Attachments',
                    response: bathroomData.mainImageUrl ? [interaction.options.get('imagem')!.attachment!] : undefined,
                    options: {
                        message: 'Imagem: esta imagem será definida como a principal do banheiro!',
                        name: 'mainImageUrl',
                        collectorIdle: 60_000 * 5, // 5 minutes
                        fixMessage: 'Envie outra imagem se desejar substituir a atual',
                        maxAttachments: 1,
                        cleanButton: {}
                    }
                },
                {
                    type: 'Attachments',
                    options: {
                        message: 'Envie abaixo mais imagens do banheiro',
                        name: 'imagesUrls',
                        collectorIdle: 60_000 * 5, // 5 minutes
                        fixMessage: 'Envie outra imagem se desejar substituir a atual',
                        maxAttachments: Bathroom.imagesLimit - 1,
                        cleanButton: {},
                    }
                }
            ]
        );

        await form.run(form.questions.toJSON().findIndex((question) => question.options.name === firstNotFilledField));

        const previewMessageCollector = previewMessage.createMessageComponentCollector({ filter: defaultCollectorFilter });

        return new Promise((resolve, reject) => {
            form.on('responseUpdate', async (question) => {
                try {
                    const name = question.options.name as keyof typeof bathroomData;
            
                    if (['campus', 'gender', 'mainImageUrl', 'imagesUrls'].includes(name)) {
                        // @ts-expect-error - ts can't understand this
                        if (name === 'campus' || name === 'gender') bathroomData[name] = (question as Question<'StringSelect'>).response[0];
            
                        else if (name === 'imagesUrls') {
                            bathroomData[name] = ((form.questions.get('mainImageUrl')?.response as Attachment[] | undefined)?.[0] ? 
                                [(form.questions.get('mainImageUrl')!.response as Attachment[])[0].url] : 
                                []
                            ).concat((question as Question<'Attachments'>).response?.map((attachment) => attachment.url));
                        }
                        else if (name === 'mainImageUrl') bathroomData[name] = (question as Question<'Attachments'>).response?.[0]?.url;
                    } else {
                        // @ts-expect-error - ts can't understand this
                        bathroomData[name] = question.response;
                    }
            
                    await interaction.editReply(await bathroomPreviewMessageOptionsFactory())
                        .catch((error) => {
                            log.error(`Erro ao executar #i(CommandInteraction)###(editReply())# enquanto executava listener #(responseUpdate)# do form #(${form.name})# para o comando #(${interaction.commandName})# executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#.\n#(Erro)#:`, error);
                            throw error;
                        });
                } catch (error) {
                    log.error(`Erro ao executar listener #(responseUpdate)# do form #(${form.name})# enquanto executava o comando #(${interaction.commandName})# executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#.\n#(Erro)#:`, error);
                    reject(error);
                }
            });
        
                
            previewMessageCollector.on('collect', async (i) => {
                try {
                    if (i.customId === 'cancel-bathroom-register') {
                        form.stop();
            
                        await interaction.deleteReply(form.questionMessage)
                            .catch((error) => {
                                log.error(`Erro ao deletar mensagem #(questionMessage)# enquanto cancelava o formulário #(${form.name})# enquanto executava o comando #(${interaction.commandName})#, executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(Erro)#:`, error, '\n#(QuestionMessage)#:', form.questionMessage);
                                throw error;
                            });
                        
                                
                        const messageOptions = {
                            content: '❌ Banheiro não criado. Cadastro cancelado!',
                            embeds: [],
                            components: []
                        };
            
                        await interaction.editReply(messageOptions)
                            .catch((error) => {
                                log.error(`Erro ao usar #i(CommandInteraction)###(editReply(messageOptions))# enquanto cancelava o formulário #(${form.name})# enquanto executava o comando #(${interaction.commandName})#, executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(messageOptions)#:`, messageOptions, '\n#(Erro)#:', error);
                                throw error;
                            });
                    }
                } catch (error) {
                    log.error(`Erro ao executar listener #(collect)# do ComponentCollector #(previewMessageCollector)# enquanto executava o comando #(${interaction.commandName})# executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#.\n#(Erro)#:`, error);
                    reject(error);
                }
            });
        
        
            form.on('finishForm', async (reason, responses) => {
                try {
                    previewMessageCollector.stop();
            
                    if (reason) {
                        if (reason === 'idle') {
                            await interaction.deleteReply(form.questionMessage)
                                .catch((error) => {
                                    log.error(`Erro ao deletar mensagem #(questionMessage)# quando finalizado o formulário #(${form.name})# enquanto executava o comando #(${interaction.commandName})#, executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(Erro)#:`, error, '\n#(QuestionMessage)#:', form.questionMessage);
                                    throw error;
                                });
                        
                                
                            const messageOptions = {
                                content: '❌ Banheiro não criado. Formulário não completo!',
                                embeds: [],
                                components: []
                            };
            
                            await interaction.editReply(messageOptions)
                                .catch((error) => {
                                    log.error(`Erro ao usar #i(CommandInteraction)###(editReply(messageOptions))# quando finalizado o formulário #(${form.name})# enquanto executava o comando #(${interaction.commandName})#, executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(messageOptions)#:`, messageOptions, '\n#(Erro)#:', error);
                                    throw error;
                                });
                        }
            
                        return resolve('not created');
                    } 
            
            
                    /** Updates bathroomData with the responses of the form */
                    bathroomData = {
                        campus: (responses.get('campus')! as CampusValues[])[0],
                        institute: (responses.get('institute')! as string),
                        floor: (responses.get('floor')! as number),
                        haveShower: (responses.get('haveShower')! as boolean),
                        hasHandDryer: (responses.get('hasHandDryer')! as boolean),
                        gender: (responses.get('gender') as GenderValues[] | [])[0],
                        cabins: (responses.get('cabins') as number | undefined),
                        urinals: (responses.get('urinals') as number | undefined),
                        localization: (responses.get('localization') as string | undefined),
                        mainImageUrl: (responses.get('mainImageUrl') as Attachment[] | [])[0]?.url,
                        imagesUrls: (responses.get('imagesUrls') as Attachment[] | []).map((attachment) => attachment.url)
                    };
            
            
                    /** Instace the new Bathroom */
                    const bathroom = new Bathroom(
                        {
                            id: Date.now().toString(),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            createdBy: interaction.user.id,
                            ...bathroomData as Omit<Bathroom, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
                        }
                    );
                
                    /** Saves the new Bathroom on the database */
                    await client.database?.bathroom.new(bathroom);
                
                    
                    !client.admins.includes(interaction.user.id) && limiter[interaction.user.id].successfullyTimes++;
                



                    // Updates the previewMessage with the created bathroom

                    const messageOptions = {
                        embeds: [await bathroomEmbedFactory(client, {
                            ...bathroom,
                            avaliations: new Collection(),
                        })],
                        components: [],
                    };

                    await interaction.editReply(messageOptions)
                        .catch((error) => {
                            log.error(`Erro ao usar #i(CommandInteraction)###(editReply(messageOptions))# quando finalizado o formulário #(${form.name})# enquanto executava o comando #(${interaction.commandName})#, executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(messageOptions)#:`, messageOptions, '\n#(Erro)#:', error);
                            throw error;
                        });
                



                    // Send the success message

                    const registeredBathroomMessageOptions = { content: 'Banheiro cadastrado com sucesso!', ephemeral: true };

                    await interaction.followUp(registeredBathroomMessageOptions)
                        .catch((error) => {
                            log.error(`Erro ao usar #i(CommandInteraction)###(followUp(registeredBathroomMessageOptions))# quando finalizado o formulário #(${form.name})# enquanto executava o comando #(${interaction.commandName})#, executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#\n#(registeredBathroomMessageOptions)#:`, registeredBathroomMessageOptions, '\n#(Erro)#:', error);
                            throw error;
                        });

                    
                    resolve('created');
                } catch (error) {
                    log.error(`Erro ao executar listener #(finishForm)# do form #(${form.name})# enquanto executava o comando #(${interaction.commandName})# executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#.\n#(Erro)#:`, error);
                    reject(error);
                }
            });
        
            form.on('error', (...error) => {
                if (isObject(error[0]) && (error[0].error === 'idle' || error[0].error === 'time')) return;

                log.error(`Erro enquanto executava o formulário #(${form.name})# enquanto executava o comando #(${interaction.commandName})#, executado pelo usuário #(@${interaction.user.tag ?? interaction.user.id})# no servidor #(${interaction.guild?.name ?? interaction.guildId})#.\n#(Erro)#:`, ...error, '\n#(CommandInteraction)#:', interaction);
                reject(error);
            });
        });
        


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
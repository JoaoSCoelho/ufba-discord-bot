import { AttachmentBuilder, ChannelType } from 'discord.js';
import { EventEmitter } from 'node:events';
import Bathroom from '../classes/database/Bathroom';
import DbCollection from './DbCollection';
import LocalClient from '../classes/LocalClient';
import axios from 'axios';
import ClassEntity from '../classes/database/Entity';
import BathroomAvaliation from '../classes/database/BathroomAvaliation';
import Member from '../classes/database/Member';
import { log } from '..';
import prettyBytes from 'pretty-bytes';

export interface DatabaseInterface {
    bathroom: Bathroom[];
    bathroomAvaliation: BathroomAvaliation[];
    member: Member[];
}

export type EntityClasses = typeof Bathroom | typeof BathroomAvaliation | typeof Member

export default class Database extends EventEmitter {
    public bathroom: DbCollection<Bathroom>;
    public bathroomAvaliation: DbCollection<BathroomAvaliation>;
    public member: DbCollection<Member>;


    constructor(public readonly client: LocalClient) {
        super();
        
        this.bathroom = new DbCollection('bathroom', this);
        this.bathroomAvaliation = new DbCollection('bathroomAvaliation', this);
        this.member = new DbCollection('member', this);

        this.fetch().then(() => this.emit('ready'));
    }

    toJSON() {
        return {
            bathroom: this.bathroom.toJSON(),
            bathroomAvaliation: this.bathroomAvaliation.toJSON(),
            member: this.member.toJSON(),
        };
    }

    /** Get discord channel of Database files posts */
    async getDbChannel() {
        const dbChannel = await this.client.channels.fetch(process.env.DATABASE_CHANNEL_ID!)
            .catch((error) => {
                log.error(`Erro ao buscar #(dbChannel)# com ID: #(${process.env.DATABASE_CHANNEL_ID})#`, error);
                throw error;
            });

        if (!dbChannel?.isTextBased() || dbChannel.type !== ChannelType.GuildText) {
            log.error(`Database channel "#(${dbChannel?.id ?? process.env.DATABASE_CHANNEL_ID})# is not a TextChannel"`);
            throw new Error('Database channel is not a TextChannel');
        }

        return dbChannel;
    }


    // Discord → Memory


    /** `PT`: Atualiza o banco local com o que existe globalmente e retorna uma `DbCollection` de `entityName`, caso seja passado. */
    async fetch<Entity extends ClassEntity = ClassEntity>(entityName?: keyof DatabaseInterface): Promise<void | DbCollection<Entity>> {
        log.loading('Started database fetching...');

        // Gets the discord channel and the last message
        const dbChannel = await this.getDbChannel();

        const lastMessage = (await dbChannel.messages.fetch({ limit: 1 })
            .catch((error) => {
                log.error(`Erro ao buscar a última mensagem do dbChannel #(#${dbChannel.name})# (#(${dbChannel.id})#)`, error);
                throw error;
            })).first();

        if (!lastMessage) {
            log.error(`Não há nenhuma mensagem no dbChannel #(#${dbChannel.name})# (#(${dbChannel.id})#)`);
            throw new Error('There is not a published database');
        }



        // Gets the file of the last message
        const file = lastMessage.attachments.find((att) => att.contentType?.startsWith('application/json'));
        
        if (!file) {
            log.error(`Não há arquivos na última mensagem do dbChannel #(#${dbChannel.name})# (#(${dbChannel.id})#)`);
            throw new Error('There is no file in last published database');
        }



        // Make a request to file url and gets the data
        const response = await axios.get(file.url);
        const json = response.data;


        this.setCache(json, entityName ? [entityName] : undefined);


        if (entityName) return this[entityName as keyof DatabaseInterface] as unknown as DbCollection<Entity>;
    }

    /** `PT`: Seta localmente os dados de `data` para as collections em `collections` */
    setCache(data: DatabaseInterface, collections: (keyof DatabaseInterface)[] = ['bathroom', 'bathroomAvaliation', 'member']) {
        const collectionsAndHisClasses: [keyof DatabaseInterface, EntityClasses | undefined][] = collections.map((entityName) => {
            let entityClass: EntityClasses | undefined = undefined;
 
            if (entityName === 'bathroom') entityClass = Bathroom;
            if (entityName === 'bathroomAvaliation') entityClass = BathroomAvaliation;
            if (entityName === 'member') entityClass = Member;

            return [entityName, entityClass];
        });


        
        collectionsAndHisClasses.forEach(([entityName, entityClass]) => {
            if (!entityClass) {
                log.error(`The #("entityClass")# for "#(${entityName})#" entity is undefined!`);
                throw new Error(`"entityClass" for "${entityName}" entity is undefined!`);
            }

            if (!this[entityName]) {
                log.error(`The entityName "#(${entityName})#" is not a key of Database!`);
                throw new Error(`entityName "${entityName}" is not a key of Database!`);
            }



            data[entityName]?.forEach(entityJson => {
                const entity = new entityClass(({
                    ...entityJson,
                    createdAt: new Date(entityJson.createdAt),
                    updatedAt: new Date(entityJson.updatedAt),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this[entityName].set(entity.id, entity as any);
            });
        });
    }




    // Memory → Discord

    // control variables for database globally updating
    private canUpdate: boolean = true;
    private updatesInBuffer: boolean = false;
    private updateTimeout = 10_000; // 10s

    /** `PT`: Usado sempre que o banco de dados local é atualizado. Controla quando o banco de dados local deve ser postado globalmente */
    async globalUpdateSystem() {
        if (this.canUpdate) {
            await this.updateInDiscord();

            this.canUpdate = false;
            this.updatesInBuffer = false;
            setTimeout(() => {
                this.canUpdate = true;
                if (this.updatesInBuffer) this.globalUpdateSystem();
            }, this.updateTimeout);

            return 'updated';
        } else {
            this.updatesInBuffer = true;

            return 'buffer';
        }
    }

    /** `PT`: Envia o banco de dados local, globalmente */
    async updateInDiscord() {
        const dbChannel = await this.getDbChannel();
            
        const FILE_NAME = 'db.json';
        const fileBuffer = Buffer.from(JSON.stringify(this.toJSON(), null, 4));

        await dbChannel.send({ files: [new AttachmentBuilder(fileBuffer, { name: FILE_NAME })] })
            .then(() => log.infoh(`Banco de dados atualizado no Discord. Tamanho total #(${prettyBytes(fileBuffer.length)})#`))
            .catch((error) => {
                log.error(`Erro ao enviar arquivo #(${FILE_NAME})# no dbChannel #(#${dbChannel.name})# (#(${dbChannel.id})#)`, error);
                throw error;
            });
    }
}
import { AttachmentBuilder } from 'discord.js';
import { EventEmitter } from 'node:events';
import Bathroom from '../classes/database/Bathroom';
import DbCollection from './DbCollection';
import LocalClient from '../classes/LocalClient';
import axios from 'axios';
import ClassEntity from '../classes/database/Entity';
import BathroomAvaliation from '../classes/database/BathroomAvaliation';
import Member from '../classes/database/Member';

export interface DatabaseInterface {
    bathroom: Bathroom[];
    bathroomAvaliation: BathroomAvaliation[];
    member: Member[];
}

export default class Database extends EventEmitter {
    public bathroom: DbCollection<Bathroom>;
    public bathroomAvaliation: DbCollection<BathroomAvaliation>;
    public member: DbCollection<Member>;
    private canUpdate: boolean = true;
    private updatesInBuffer: boolean = false;
    private updateTimeout = 10000; // 10s

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

    async getDbChannel() {
        const dbChannel = await this.client.channels.fetch(process.env.DATABASE_CHANNEL_ID!);
        if (!dbChannel?.isTextBased()) throw new Error('Database channel is not a TextChannel');

        return dbChannel;
    }

    async fetch<Entity extends ClassEntity = ClassEntity>(entityName?: string): Promise<void | DbCollection<Entity>> {
        const dbChannel = await this.getDbChannel();

        const lastMessage = (await dbChannel.messages.fetch({ limit: 1 })).first();
        if (!lastMessage) throw new Error('There is not a published database');
        const file = lastMessage.attachments.find((att) => att.contentType?.startsWith('application/json'));
        
        if (!file) throw new Error('There is no file in last published database');
        const response = await axios.get(file.url);
        const json = response.data;

        this.setCache(json);
        if (entityName) return this[entityName as keyof Database] as unknown as DbCollection<Entity>;
    }

    setCache(data: DatabaseInterface) {
        // Set the bathrooms at the cache
        data.bathroom?.map(bathroomJson => {
            const bathroom = new Bathroom({
                ...bathroomJson,
                createdAt: new Date(bathroomJson.createdAt),
                updatedAt: new Date(bathroomJson.updatedAt),
            });

            this.bathroom.set(bathroom.id, bathroom);
        });

        data.bathroomAvaliation?.map(bathroomAvaliationJson => {
            const bathroomAvaliation = new BathroomAvaliation({
                ...bathroomAvaliationJson,
                createdAt: new Date(bathroomAvaliationJson.createdAt),
                updatedAt: new Date(bathroomAvaliationJson.updatedAt)
            });

            this.bathroomAvaliation.set(bathroomAvaliation.id, bathroomAvaliation);
        });

        data.member?.map(memberJson => {
            const member = new Member({
                ...memberJson,
                createdAt: new Date(memberJson.createdAt),
                updatedAt: new Date(memberJson.updatedAt)
            });

            this.member.set(member.id, member);
        });
    }

    async write<Entity extends ClassEntity = ClassEntity>(entityName: string, entity: Entity) {
        await this.updateInDiscord();
        this.emit('write', entityName, entity);
    }

    async edit<Entity extends ClassEntity = ClassEntity>(entityName: string, newEntity: Entity) {
        await this.updateInDiscord();
        this.emit('edit', entityName, newEntity);
    }

    async remove(entityName: string, entityId: string) {
        await this.updateInDiscord();
        this.emit('remove', entityName, entityId);
    }

    async updateInDiscord() {
        if (this.canUpdate) {
            const dbChannel = await this.getDbChannel();
            
            await dbChannel.send({ 
                files: [new AttachmentBuilder(
                    Buffer.from(JSON.stringify(this.toJSON(), null, 4)),
                    { name: 'db.json' }
                )],
            });
            this.canUpdate = false;
            this.updatesInBuffer = false;
            setTimeout(() => {
                this.canUpdate = true;
                if (this.updatesInBuffer) this.updateInDiscord();
            }, this.updateTimeout);
        } else {
            this.updatesInBuffer = true;
        }
    }
}
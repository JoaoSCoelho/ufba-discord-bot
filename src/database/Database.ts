import { AttachmentBuilder } from 'discord.js';
import { EventEmitter } from 'node:events';
import Bathroom from '../classes/database/Bathroom';
import DbCollection from './DbCollection';
import LocalClient from '../classes/LocalClient';
import axios from 'axios';
import ClassEntity from '../classes/database/Entity';

export interface DatabaseInterface {
    bathroom: Bathroom[];
}

export default class Database extends EventEmitter {
    public bathroom: DbCollection<Bathroom>;
    private canUpdate: boolean = true;
    private updatesInBuffer: boolean = false;
    private updateTimeout = 10000; // 10s

    constructor(public readonly client: LocalClient) {
        super();
        this.bathroom = new DbCollection('bathroom', this);
        this.fetch();
    }

    toJSON() {
        return {
            bathroom: this.bathroom.toJSON()
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
        this.emit('ready');
        if (entityName) return this[entityName as keyof Database] as unknown as DbCollection<Entity>;
    }

    setCache(data: DatabaseInterface) {
        // Set the bathrooms at the cache
        data.bathroom.map(bathroomJson => {
            const bathroom = new Bathroom({
                id: bathroomJson.id,
                createdAt: new Date(bathroomJson.createdAt),
                updatedAt: new Date(bathroomJson.updatedAt),
                campus: bathroomJson.campus,
                institute: bathroomJson.institute,
                floor: bathroomJson.floor,
                haveShower: bathroomJson.haveShower,
                createdBy: bathroomJson.createdBy,
                localization: bathroomJson.localization,
                mainImageUrl: bathroomJson.mainImageUrl,
                imagesUrls: bathroomJson.imagesUrls
            });

            this.bathroom.set(bathroom.id, bathroom);
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
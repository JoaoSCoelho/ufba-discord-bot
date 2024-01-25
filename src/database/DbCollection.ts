import { Collection } from 'discord.js';
import Database from './Database';
import ClassEntity from '../classes/database/Entity';

export default class DbCollection<Entity extends ClassEntity> extends Collection<string, Entity> {
    constructor(
        private readonly entityName: string,
        private readonly database: Database,
        ...rest: ConstructorParameters<typeof Collection<string, Entity>>
    ) {
        super(...rest);   
    }

    async new(entity: Entity) {
        if (this.has(entity.id)) throw new Error('Has already a entity with this ID');

        this.set(entity.id, entity);
        await this.database.write(this.entityName, entity);
    }

    async edit(newEntity: Entity) {
        if (!this.has(newEntity.id)) throw new Error('There is no entity with this ID');

        this.set(newEntity.id, newEntity);
        await this.database.edit(this.entityName, newEntity);
    }

    async remove(entityId: string) {
        if (!this.has(entityId)) throw new Error('There is not entity with this ID');

        this.delete(entityId);

        await this.database.remove(this.entityName, entityId);
    }

    fetch() {
        return this.database.fetch<Entity>(this.entityName);
    }
}
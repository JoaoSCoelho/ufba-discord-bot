import { Collection } from 'discord.js';
import Database, { DatabaseInterface } from './Database';
import ClassEntity from '../classes/database/Entity';
import { log } from '../classes/LogSystem';

/** A extension of a Collection, but with methods of Database */
export default class DbCollection<Entity extends ClassEntity> extends Collection<string, Entity> {
    constructor(
        private readonly entityName: keyof DatabaseInterface,
        private readonly database: Database,
        ...rest: ConstructorParameters<typeof Collection<string, Entity>>
    ) {
        super(...rest);
    }


    /** `PT`: Adiciona `entity` ao Database local e faz uma chamada para atualizar globalmente */
    async new(entity: Entity) {
        entity = { ...entity, createdAt: new Date() } as Entity;

        if (this.has(entity.id)) throw new Error('Has already a entity with this ID');


        this.set(entity.id, entity);
        log.infoh(`Um novo registro, ID: #(${entity.id})#, foi adicionado à coleção #(${this.entityName})#`);


        
        this.database.emit('entityCreate', this.entityName, entity);



        await this.database.globalUpdateSystem()
            .then((status) => {
                if (status === 'updated') log.infoh(`O novo registro, ID: #(${entity.id})#, foi globalmente incorporado`);
                else if (status === 'buffer') log.infoh(`O novo registro, ID: #(${entity.id})#, está na fila para ser globalmente incorporado`);
            })
            .catch ((error) => {
                log.error(`Erro ao usar #g(globalUpdateSystem)# ao criar entidade ID: #(${entity.id})#`, error);
                throw error;
            });
    }


    /** `PT`: Atualiza `entity` no Database local e faz uma chamada para atualizar globalmente */
    async edit(newEntity: Entity) {
        newEntity = { ...newEntity, updatedAt: new Date() };

        if (!this.has(newEntity.id)) throw new Error('There is no entity with this ID');


        this.set(newEntity.id, newEntity);
        log.infoh(`O registro ID: #(${newEntity.id})# da coleção #(${this.entityName})# foi editado`);


        this.database.emit('entityUpdate', this.entityName, newEntity);


        await this.database.globalUpdateSystem()
            .then((status) => {
                if (status === 'updated') log.infoh(`O registro, ID: #(${newEntity.id})#, foi globalmente atualizado`);
                else if (status === 'buffer') log.infoh(`O registro, ID: #(${newEntity.id})#, está na fila para ser globalmente atualizado`);
            })
            .catch ((error) => {
                log.error(`Erro ao usar #g(globalUpdateSystem)# ao editar entidade ID: #(${newEntity.id})#`, error);
                throw error;
            });
    }


    /** `PT`: Remove a entidade `entityId` do Database local e faz uma chamada para atualizar globalmente */
    async remove(entityId: string) {
        if (!this.has(entityId)) throw new Error('There is not entity with this ID');

        const deletedEntity = this.get(entityId)!;

        this.delete(entityId);
        log.infoh(`O registro ID: #(${entityId})# da coleção #(${this.entityName})# foi removido`);


        this.database.emit('entityDelete', this.entityName, deletedEntity);


        await this.database.globalUpdateSystem()
            .then((status) => {
                if (status === 'updated') log.infoh(`O registro, ID: #(${entityId})#, foi globalmente removido`);
                else if (status === 'buffer') log.infoh(`O registro, ID: #(${entityId})#, está na fila para ser globalmente removido`);
            })
            .catch ((error) => {
                log.error(`Erro ao usar #g(globalUpdateSystem)# ao editar entidade ID: #(${entityId})#`, error);
                throw error;
            });
    }

    /** `PT`: Atualiza o banco local em `this.entityName` com o que existe globalmente e retorna uma `DbCollection` de `this.entityName`. */
    fetch() {
        return this.database.fetch<Entity>(this.entityName);
    }
}
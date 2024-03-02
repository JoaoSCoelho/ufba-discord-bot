import { Collection } from 'discord.js';
import Database, { DatabaseInterface } from './Database';
import ClassEntity from '../classes/database/Entity';
import { log } from '..';
import chalk from 'chalk';

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

        await this.database.write(this.entityName, entity)
            .then(() => log.info(`Um novo registro, ${chalk.bold('ID')}: #(${entity.id})#, foi adicionado à coleção #(${this.entityName})#`))
            .catch ((error) => {
                log.error(`Erro ao escrever no banco de dados. ${chalk.bold('ID')}: #(${entity.id})#`, error);
                throw error;
            });
    }


    /** `PT`: Atualiza `entity` no Database local e faz uma chamada para atualizar globalmente */
    async edit(newEntity: Entity) {
        newEntity = { ...newEntity, updatedAt: new Date() };

        if (!this.has(newEntity.id)) throw new Error('There is no entity with this ID');

        this.set(newEntity.id, newEntity);

        await this.database.edit(this.entityName, newEntity)
            .then(() => log.info(`O registro ${chalk.bold('ID')}: #(${newEntity.id})# da coleção #(${this.entityName})# foi editado`))
            .catch ((error) => {
                log.error(`Erro ao editar no banco de dados. ${chalk.bold('ID')}: #(${newEntity.id})#`, error);
                throw error;
            });
    }


    /** `PT`: Remove a entidade `entityId` do Database local e faz uma chamada para atualizar globalmente */
    async remove(entityId: string) {
        if (!this.has(entityId)) throw new Error('There is not entity with this ID');

        this.delete(entityId);

        await this.database.remove(this.entityName, entityId)
            .then(() => log.info(`O registro ${chalk.bold('ID')}: #(${entityId})# da coleção #(${this.entityName})# foi removido`))
            .catch ((error) => {
                log.error(`Erro ao remover do banco de dados. ${chalk.bold('ID')}: #(${entityId})#`, error);
                throw error;
            });
    }

    /** `PT`: Atualiza o banco local em `this.entityName` com o que existe globalmente e retorna uma `DbCollection` de `this.entityName`. */
    fetch() {
        return this.database.fetch<Entity>(this.entityName);
    }
}
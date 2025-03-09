import AdminCommand from '../classes/AdminCommand';
import { DatabaseInterface } from '../database/Database';
import DbCollection from '../database/DbCollection';

/** Clears one collection of the database */
export default class ClearDbAdminCommand extends AdminCommand {
    public static readonly data = { name: 'cleardb' };

    public async execute() {
        const collectionName = (this.params.collection || this.words[0]) as keyof DatabaseInterface;

        if (!this.client.database![collectionName]) return this.message.reply('Coleção não existe!');

        // Send a intermediate message to confirm the action
        const confirmationMessage = await this.message.reply(`Tem certeza que deseja limpar a coleção **${collectionName}**?`);

        await confirmationMessage.react('✅');

        const reacted = await confirmationMessage.awaitReactions({
            max: 1,
            filter: (reaction, user) => {
                return reaction.emoji.name === '✅' && user.id === this.message.author.id;
            }
        });

        if (reacted.size === 0) return this.message.reply('Ação finalizada!');



        // @ts-expect-error Erro bobo
        client.database![collectionName] = new DbCollection(collectionName, client.database!);

        await this.client.database!.updateInDiscord();

        return this.message.reply('Coleção limpa!');
    }
}
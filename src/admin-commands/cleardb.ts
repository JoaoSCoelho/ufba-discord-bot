import AdminCommand from '../classes/AdminCommand';
import { DatabaseInterface } from '../database/Database';
import DbCollection from '../database/DbCollection';

// Clears one collection of the database
export default new AdminCommand(
    {
        name: 'cleardb'
    },
    async (message, client, params, words) => {
        const collectionName = (params.collection || words[0]) as keyof DatabaseInterface;

        if (!client.database![collectionName]) return message.reply('Coleção não existe!');

        // Send a intermediate message to confirm the action
        const confirmationMessage = await message.reply(`Tem certeza que deseja limpar a coleção **${collectionName}**?`);

        await confirmationMessage.react('✅');

        const reacted = await confirmationMessage.awaitReactions({
            max: 1,
            filter: (reaction, user) => {
                return reaction.emoji.name === '✅' && user.id === message.author.id;
            }
        });

        if (reacted.size === 0) return message.reply('Ação finalizada!');

        
        
        // @ts-expect-error Erro bobo
        client.database![collectionName] = new DbCollection(collectionName, client.database!);

        await client.database!.updateInDiscord();

        return message.reply('Coleção limpa!');
    }
);
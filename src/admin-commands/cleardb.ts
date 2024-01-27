import AdminCommand from '../classes/AdminCommand';
import { DatabaseInterface } from '../database/Database';
import DbCollection from '../database/DbCollection';

export default new AdminCommand(
    {
        name: 'cleardb'
    },
    async (message, client, params, words) => {
        const collectionName = (params.collection || words[0]) as keyof DatabaseInterface;

        const confirmationMessage = await message.reply(`You should clear ${collectionName} collection?`);

        await confirmationMessage.react('✅');

        const reacted = await confirmationMessage.awaitReactions({
            max: 1,
            filter: (reaction, user) => {
                return reaction.emoji.name === '✅' && user.id === message.author.id;
            }
        });

        if (reacted.size === 0) return message.reply('Ação finalizada!');

        if (!client.database![collectionName]) return message.reply('Collection doesn\'t exists');
        
        // @ts-expect-error Erro bobo
        client.database![collectionName] = new DbCollection(collectionName, client.database!);

        await client.database?.updateInDiscord();

        return message.reply('Collection cleaned!');
    }
);
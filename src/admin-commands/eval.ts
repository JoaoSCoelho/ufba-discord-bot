import AdminCommand from '../classes/AdminCommand';

export default new AdminCommand({
    name: 'eval'
}, 
async (message, client) => {
    message.reply(`${eval(message.content.slice(client.prefix.length + 4 + 1))}`);
});
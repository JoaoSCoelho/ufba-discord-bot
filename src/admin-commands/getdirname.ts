import AdminCommand from '../classes/AdminCommand';

export default new AdminCommand(
    {
        name: 'getdirname'
    },
    async (message) => {
        await message.author.send({
            content: `dirname: \`${__dirname}\`\nfilename: \`${__filename}\``
        });
    }
);
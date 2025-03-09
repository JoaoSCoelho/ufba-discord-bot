import AdminCommand from '../classes/AdminCommand';

export default class GetDirnameAdminCommand extends AdminCommand {
    public static readonly data = { name: 'getdirname' };

    public async execute() {
        await this.message.author.send({
            content: `dirname: \`${__dirname}\`\nfilename: \`${__filename}\``
        });
    }
}
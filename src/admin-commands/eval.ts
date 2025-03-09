import AdminCommand from '../classes/AdminCommand';

export default class EvalAdminCommand extends AdminCommand {
    public static readonly data = { name: 'eval' };

    public async execute() {
        await this.message.author.send(`${eval(this.message.content.slice(this.client.prefix.length + 4 + 1))}`);
    }
}
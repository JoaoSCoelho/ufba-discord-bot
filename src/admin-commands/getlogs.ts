import { AttachmentBuilder } from 'discord.js';
import AdminCommand from '../classes/AdminCommand';
import fs from 'node:fs';

export default class GetLogsAdminCommand extends AdminCommand {
    public static readonly data = { name: 'getlogs' };

    public async execute() {
        await this.message.author.send({
            files: [
                new AttachmentBuilder(Buffer.from(fs.readFileSync('log.ansi', { encoding: 'utf8' })).subarray(-26214400), { name: 'log.ansi' }),
                new AttachmentBuilder(Buffer.from(fs.readFileSync('log.txt', { encoding: 'utf8' })).subarray(-26214400), { name: 'log.txt' }),
            ]
        });
    }
}
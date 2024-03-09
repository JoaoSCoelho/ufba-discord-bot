import { AttachmentBuilder } from 'discord.js';
import AdminCommand from '../classes/AdminCommand';
import fs from 'node:fs';

export default new AdminCommand(
    {
        name: 'getlogs'
    },
    async (message) => {
        await message.author.send({
            files: [
                new AttachmentBuilder(Buffer.from(fs.readFileSync('log.ansi', { encoding: 'utf8' })).subarray(-26214400), { name: 'log.ansi' }),
                new AttachmentBuilder(Buffer.from(fs.readFileSync('log.txt', { encoding: 'utf8' })).subarray(-26214400), { name: 'log.txt' }),
            ]
        });
    }
);
import { Message } from 'discord.js';
import LocalClient from './classes/LocalClient';
import Member from './classes/database/Member';

export const levels = [
    { targetScore: 100 },
    { targetScore: 300 },
    { targetScore: 800 },
    { targetScore: 3_000 },
    { targetScore: 10_000 },
    { targetScore: 20_000 },
    { targetScore: 50_000 },
    { targetScore: 100_000 },
    { targetScore: 300_000 },
    { targetScore: 800_000 },
    { targetScore: 3_000_000 },
    { targetScore: 10_000_000 },
    { targetScore: 20_000_000 },
    { targetScore: 50_000_000 },
    { targetScore: 100_000_000 },
    { targetScore: 300_000_000 },
    { targetScore: 800_000_000 },
    { targetScore: 3_000_000_000 },
    { targetScore: 10_000_000_000 },
    { targetScore: 100_000_000_000 },
    { targetScore: 1_000_000_000_000 },
    { targetScore: 10_000_000_000_000 },
    { targetScore: 100_000_000_000_000 },
];

export default async function scoreSystem(client: LocalClient, message: Message<true>) {
    if (!client.database) return;
    if (!message.member) return;

    // Filter only significative messages
    if (message.content.length < 3) return;

    const oldMember = client.database.member.find((member) => member.discordId === message.member!.id && member.discordGuildId === message.guild.id)!;;

    if (!oldMember) {
        const newMember = new Member({
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            discordGuildId: message.guild.id,
            discordId: message.member.id,
            score: 3
        });
        
        await client.database.member.new(newMember);
    } else {
        await client.database.member.edit({
            ...oldMember,
            score: oldMember.score + 3,
        });
    }

    const oldMemberScore = oldMember?.score ?? 0;
    const member = client.database.member.find((member) => member.discordId === message.member!.id && member.discordGuildId === message.guild.id)!;

    levels.forEach(({ targetScore }, index) => {
        if (oldMemberScore < targetScore && member.score >= targetScore) 
            message.reply(`Parabéns ${message.member}, você passou para o level ${index + 1}`).catch(() => 0);
    });
} 
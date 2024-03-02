import { Message, PermissionsBitField } from 'discord.js';
import LocalClient from './classes/LocalClient';
import Member from './classes/database/Member';
import { log } from '.';

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

/** Computes a new pontuation to a member when he sent a message */
export default async function scoreSystem(client: LocalClient, message: Message<true>) {
    if (!client.database) return;
    if (!message.member) return;

    // Filter only significative messages
    if (message.content.length < 3) return;


    /** The database member that match with the message member */
    const dbMember = client.database.member.find((member) => member.discordId === message.member!.id && member.discordGuildId === message.guild.id);

    if (!dbMember) {
        log.loadingh(`Adicionando membro #(@${message.member.user.tag})# do servidor #(${message.guild.name})# ao banco de dados`);

        const newMember = new Member({
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            discordGuildId: message.guild.id,
            discordId: message.member.id,
            score: 3
        });
        
        await client.database.member.new(newMember)
            .then(() => log.successh(`Membro #(@${message.member!.user.tag})# do servidor #(${message.guild.name})# adicionado ao banco de dados com #(${newMember.score})# pontos de score`))
            .catch((error) => log.error(`Erro ao adicionar membro #(@${message.member!.user.tag})# do servidor #(${message.guild.name})# ao banco de dados\n#(Membro)#:`, newMember, '\n#(Error)#:', error));
    } else {
        const newMemberData = {
            ...dbMember,
            updatedAt: new Date(),
            score: dbMember.score + 3,
        };

        await client.database.member.edit(newMemberData)
            .then(() => log.successh(`Membro #(@${message.member!.user.tag})# do servidor #(${message.guild.name})# recebeu 3 pontos de score e possui agora #(${newMemberData.score})# ao total`))
            .catch((error) => log.error(`Erro ao adicionar score ao membro #(@${message.member!.user.tag})# do servidor #(${message.guild.name})#\n#(Data)#:`, newMemberData, '\n#(Erro)#:', error));
    }






    const dbMemberScore = dbMember?.score ?? 0;
    const member = client.database.member.find((member) => member.discordId === message.member!.id && member.discordGuildId === message.guild.id)!;


    // `PT`: Vai passando pelos nívels em `levels` até encontrar o nível que o usuário alcançou (se ele alcançou), e enviar a mensagem
    levels.forEach(({ targetScore }, index) => {
        if (dbMemberScore < targetScore && member.score >= targetScore) {
            log.info(`O membro #(@${message.member?.user.tag ?? message.author.id})# do servidor #(${message.guild.name})# passou para o nível #(${index + 1})#`);

            if (!message.guild.members.me?.permissionsIn(message.channel).has(PermissionsBitField.Flags.SendMessages)) return;

            const messageContent = `Parabéns ${message.member}, você passou para o level ${index + 1}`;

            message.reply(messageContent)
                .catch((error) => log.error(`Erro ao enviar resposta "#(${messageContent})#" para o usuário #(@${message.author.tag})# no canal #(#${message.channel.name})# no servidor #(${message.guild.name})#\n#(Erro)#:`, error));
        }
    });
} 
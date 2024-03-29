import { Events } from 'discord.js';
import ClientEvent from '../classes/ClientEvent';
import { client } from '..';
import { log } from '../classes/LogSystem';
import Member from '../classes/database/Member';

// Captures when a new member enter on a guild

export default new ClientEvent(Events.GuildMemberAdd, async (guildMember) => {
    if (!client.database) return;

    log.infoh(`O membro #(@${guildMember.user.tag})# foi adicionado ao servidor #(${guildMember.guild.name})#`);

    /** `true` if the member has already on database */
    const alreadyHasTheMember = !!client.database.member.find((member) =>
        member.discordGuildId === guildMember.guild.id && member.discordId === guildMember.id
    );

    if (!alreadyHasTheMember && !guildMember.user.bot) {
        // Saves the member on client database

        log.loadingh(`Salvando membro #(@${guildMember.user.tag})#`,
            `do servidor #(${guildMember.guild.name})# no banco de dados...`);

        const member = new Member({
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            discordId: guildMember.id,
            discordGuildId: guildMember.guild.id,
        });

        await client.database.member.new(member)
            .then(() => {
                log.successh(`Membro #(@${guildMember.user.tag})#`,
                    `do servidor #(${guildMember.guild.name})# adicionado ao banco de dados`);
            })
            .catch((error) => {
                log.error(`Erro ao adicionar membro #(@${guildMember.user.tag})#`,
                    `do servidor #(${guildMember.guild.name})# ao banco de dados`, 
                    error);
            });
    };

});
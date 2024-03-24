import { Events } from 'discord.js';
import { client } from '..';
import ClientEvent from '../classes/ClientEvent';
import { log } from '../classes/LogSystem';
import Member from '../classes/database/Member';

// Captures when the client enter on a guild
export default new ClientEvent(Events.GuildCreate, async (guild) => {
    log.info(`O bot acabou de entrar no servidor "#(${guild.name})#" - #(${guild.id})#`);

    if (client.database) {
        let addedMembersCount = 0;
        let errorOnAddingMemberCount = 0;

        // `PT`: Mapeia todos os membros do servidor para o banco de dados do bot
        await Promise.all(
            guild.members.cache.toJSON().map(async (guildMember, index, array) => {
                const alreadyHasTheMemberOnDatabase = !!client.database!.member.find((member) =>
                    member.discordId === guildMember.id && member.discordGuildId === guild.id
                );
    
                if (alreadyHasTheMemberOnDatabase) return;
    
    

                log.loadingh(`#(${index + 1})#/#(${array.length})# Salvando novo membro #(@${guildMember.user.tag})#`, 
                    `do servidor #(${guild.name})# no banco de dados...`);
    
                const member = new Member({
                    id: Date.now().toString(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    discordId: guildMember.id,
                    discordGuildId: guild.id,
                });
    
                await client.database!.member.new(member)
                    .then(() => {
                        log.successh(`#(${index + 1})#/#(${array.length})# Membro #(@${guildMember.user.tag})#`,
                            `do servidor #(${guild.name})# adicionado ao banco de dados`);

                        addedMembersCount++;
                    })
                    .catch((error) => {
                        log.error(`#(${index + 1})#/#(${array.length})# Erro ao adicionar membro #(@${guildMember.user.tag})#`,
                            `do servidor #(${guild.name})# ao banco de dados`,
                            '\n#(Erro)#:', error, 
                            '\n#(Membro)#:', member);

                        errorOnAddingMemberCount++;
                    });
            })
        );
    
        log.info(`#(${addedMembersCount})# membros do servidor #(${guild.name})# adicionados ao banco.`,
            `#(${errorOnAddingMemberCount})# membros tiveram erro ao serem adicionados ao banco.`);
    };

});
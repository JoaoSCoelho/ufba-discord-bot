import { Events } from 'discord.js';
import { client } from '..';
import ClientEvent from '../classes/ClientEvent';
import { log } from '../classes/LogSystem';


// Captures when the client get out of a guild

export default new ClientEvent(Events.GuildDelete, async (guild) => {
    if (!client.database) return;

    log.info(`O bot acabou de sair do servidor "#(${guild.name || guild.id})#"`);

    // Removes all members from database with this guild.id
    await Promise.all(
        client.database!.member
            .filter((member) => member.discordGuildId === guild.id)
            .toJSON()
            .map(async (member, index, array) => {
                log.loadingh(`#(${index + 1})#/#(${array.length})# Removing member #(${member.id})#`,
                    `from server #(${guild.name || guild.id})#...`);

                await client.database!.member.remove(member.id)
                    .then(() => {
                        log.successh(`#(${index + 1})#/#(${array.length})# Member #(${member.id})#`, 
                            `from server #(${guild.name || guild.id})#,`, 
                            'successfully removed from database');
                    })
                    .catch((error) => {
                        log.error(`#(${index + 1})#/#(${array.length})#`,
                            `Erro ao remover membro #(${member.id})#`, 
                            `do servidor #(${guild.name || guild.id})#`,
                            '\n#(Erro)#:', error);
                    });
            })
    );

    log.info(`Members from server #(${guild.name || guild.id})# removed from database`);
});
import * as path from 'path';
import * as fs from 'fs';
import ClientEvent from './classes/ClientEvent';
import { client } from '.';
import { ClientEvents } from 'discord.js';
import { log } from './classes/LogSystem';


export default async function eventHandler() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


    for (const file of eventFiles) {

        const filePath = path.join(eventsPath, file);
        const event: ClientEvent<keyof ClientEvents> = (await import(filePath))?.default;


        if ('eventName' in event && 'listener' in event) {
            client[event.once ? 'once' : 'on'](event.eventName, event.listener);

            log.successh(`Evento #(${event.eventName})# (#(${file})#) cadastrado com sucesso`);
        } else {
            log.warn(`O evento em #(${(file)})# não possui as propriedades necessárias "#(eventName)#" e "#(listener)#".`);
        }
    }

    log.successh(`#(${client.adminCommands.size})# eventos cadastrados com sucesso`);
}
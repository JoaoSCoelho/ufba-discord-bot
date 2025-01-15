import * as path from 'path';
import * as fs from 'fs';
import ClientEvent from '../classes/ClientEvent';
import { client } from '..';
import { ClientEvents } from 'discord.js';
import { log } from '../classes/LogSystem';

export default class EventHandler {
    /** Map all events in `'/events'` directory and register in bot event listeners */
    public async handleAllEvents() {
        const eventsPath = path.join(__dirname, 'events');
        const eventsFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


        for (const eventFile of eventsFiles) {
            const filePath = path.join(eventsPath, eventFile);
            const event: ClientEvent<keyof ClientEvents> = (await import(filePath))?.default;

            if (!(event instanceof ClientEvent)) {
                log.warn(`O evento em #(${(eventFile)})# não é uma instância de #(ClientEvent)#.`);
                continue;
            }

            client[event.once ? 'once' : 'on'](event.eventName, event.listener);

            log.successh(`Evento #(${event.eventName})# (#(${eventFile})#) cadastrado com sucesso`);
        }

        log.successh(`#(${client.adminCommands.size})# eventos cadastrados com sucesso`);
    }
}
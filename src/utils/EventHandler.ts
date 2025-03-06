// File Version: 0.0.1

import * as path from 'path';
import * as fs from 'fs';
import ClientEvent from '../classes/ClientEvent';
import { client } from '..';
import { ClientEvents } from 'discord.js';
import { log } from '../classes/LogSystem';
import BaseError from '../Errors/BaseError';
import HandledError from '../Errors/HandledError';

export default class EventHandler {
    /** Map all events in `'/events'` directory and register in bot event listeners */
    public async handleAllEvents() {
        let registeredEvents = 0;
        const eventsPath = path.join(__dirname, '../events');
        const eventsFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


        for (const eventFile of eventsFiles) {
            const filePath = path.join(eventsPath, eventFile);
            let event: ClientEvent<keyof ClientEvents>;

            try {
                event = await this.importEventInPath(filePath);
            } catch (error: unknown) {
                if (!BaseError.isHandled(error)) {
                    log.error(`Erro ao importar o evento em (#(${filePath})#):`,
                        '\n#(Erro)#:', error);

                    BaseError.handle(error);
                }

                continue; // Ignore this event
            }

            client[event.once ? 'once' : 'on'](event.eventName, event.listener);

            registeredEvents++;

            log.successh(`Evento #(${event.eventName})# (#(${eventFile})#) cadastrado com sucesso.`);
        }

        log.successh(`#(${registeredEvents})# eventos cadastrados com sucesso.`);
    }

    /** Make a import in the specified path and guarantees that the imported event is a ClientEvent
         * @returns The imported ClientEvent
         * @throws HandledError('Unknown error while importing the event)
         * @throws HandledError('The event was not imported correctly')
         * @throws HandledError('The event does not have a default export')
         * @throws HandledError('The event is not an instance of ClientEvent')
         */
    private async importEventInPath(path: string) {
        const module: unknown = await import(path)
            .catch((error: unknown) => {
                log.error(`Erro ao importar o arquivo do evento em (#(${path})#):`,
                    '\n#(Erro)#:', error);
                BaseError.handle(error);

                throw error ?? new HandledError('Unknown error while importing the event file');
            });


        if (!module || typeof module !== 'object') {
            log.error(`O evento em (#(${path})#) não foi importado corretamente.`,
                '\n#(Esperado)#: { default: ClientEvent }',
                '\n#(Recebido)#:', module
            );
            throw new HandledError('The event was not imported correctly');
        }
        if (!('default' in module)) {
            log.warn(`O evento em (#(${path})#) não tem exportação padrão.`,
                '\n#(Esperado)#: { default: ClientEvent }',
                '\n#(Recebido)#:', module
            );
            throw new HandledError('The event does not have a default export');
        }
        // Check if the supposed event is a ClientEvent instance
        if (!(module.default instanceof ClientEvent)) {
            log.warn(`O evento em (#(${path})#) não é uma instância de #(ClientEvent)#.`);
            throw new HandledError('The event is not an instance of ClientEvent');
        }

        return module.default as ClientEvent<keyof ClientEvents>;
    }
}
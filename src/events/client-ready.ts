import { Events } from 'discord.js';
import ClientEvent from '../classes/ClientEvent';
import { log } from '../classes/LogSystem';
import { client } from '..';
import Database from '../database/Database';
import LocalClient from '../classes/LocalClient';

// These event are executed when the bot goes online on discord
export default new ClientEvent(
    Events.ClientReady,
    (readyClient) => {
        log.info(`Bot #(@${readyClient.user.tag})# iniciado`);

        log.clientReady(client);

        client.database = new Database(client);

        client.database.on('ready', () => log.info('Banco de dados pronto'));

        client.scoreSystem.init(client as LocalClient<true>);
        client.scoreSystem.start();
    },
    true
);
import { Awaitable, ClientEvents, } from 'discord.js';

export default class ClientEvent<Event extends keyof ClientEvents> {
    constructor(
        public eventName: Event,
        public listener: (...args: ClientEvents[Event]) => Awaitable<void>,
        public once?: boolean,
    ) {}
}
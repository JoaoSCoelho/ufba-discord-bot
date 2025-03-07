import { Awaitable, ClientEvents, } from 'discord.js';

export default class ClientEvent<Event extends keyof ClientEvents> {
    /**
     * @param eventName - The name of the event to listen for.
     * @param listener - The function to be called when the event is emitted.
     * @param once - `true` if the listener should be called only once.
     */
    constructor(
        public eventName: Event,
        public listener: (...args: ClientEvents[Event]) => Awaitable<void>,
        public once?: boolean,
    ) { }
}
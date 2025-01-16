export interface INodeEventEmitter {
    on(event: string | symbol, listener: (...args: unknown[]) => void): this;
    once(event: string | symbol, listener: (...args: unknown[]) => void): this;
    emit(event: string | symbol, ...args: unknown[]): boolean;
    off(event: string | symbol, listener: (...args: unknown[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
}
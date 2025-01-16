export default abstract class BaseError extends Error {
    /** If `true` indicates that this error was already handled in another part of the code.
     * 
     * A handled error means that the error was already logged or treated in another part of the code.
     */
    public handled: boolean = false;

    /** Return if the `error` was already handled in another part of the code.
     * 
     * A handled error means that the error was already logged or treated in another part of the code.
     * @param error The error to be checked
     */
    public static isHandled(error: unknown): boolean {
        return !!(error && typeof error === 'object' && 'handled' in error && (error as { handled: boolean }).handled);
    }

    /** Typically used after logging the error but continuing to propagate it
     * 
     * It sets the `handled` property in the error object to `true` to indicate that the error was already handled in another part of the code.
     * @param error The error to be handled
     */
    public static handle(error: unknown): void {
        if (error && typeof error === 'object') {
            (error as { handled: boolean }).handled = true;
        }
    }
}
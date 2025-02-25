// File Version: 0.0.1

process.env.FORCE_COLOR = '1';
process.env.NO_COLOR = '0';

import * as fs from 'node:fs';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import util from 'util';
import LocalClient from './LocalClient';
import { AttachmentBuilder, ChannelType, TextChannel } from 'discord.js';


type LogType = 'I' | 'W' | 'E' | 'S' | 'L' | 'O';




configInspectDefaultOptions();

/** Store the original `process.stdout.write` */
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);


export default class LogSystem {
    /** Informs if it is the first log of the current process. This variable will receive `false` as soon as unknown log function is triggered
     */
    private firstOfProcess = true;

    /** Indicates if it is the first log of the current process since the client is available. This variable will receive `false` as soon as unknown log function is triggered with the client available
    */
    private firstOfProcessForClient = true;


    /** 
     * Saves a date when an instance is generated
     * @format (XX-XX-XXXX--XX-XX-XX) '`DAY`-`MONTH`-`YEAR`--`HOURS`-`MINUTES`-`SECONDS`'
     */
    private executionDateString: `${string}-${string}-${number}--${string}-${string}-${string}`;


    client: LocalClient | undefined;

    constructor() {
        this.executionDateString = Intl.DateTimeFormat('pt-br', { dateStyle: 'short', timeStyle: 'medium' })
            .format(new Date())
            .replaceAll(', ', '--')
            .replaceAll(' ', '-')
            .replaceAll(':', '-')
            .replaceAll('/', '-') as typeof this.executionDateString;
    }



    /** When executed, sets a client in the `LogSystem` and allows the `client` to send logs to unknown appropriate channel
     */
    clientReady(client: LocalClient) {
        this.client = client;
    }




    /** Returns a chalk result with the color used in `logSystem.info`
     */
    infoColor(...text: unknown[]) { return chalk[this.getChalkMethod('I')](...text); }
    /** Returns a chalk result with the color used in `logSystem.warn`
     */
    warnColor(...text: unknown[]) { return chalk[this.getChalkMethod('W')](...text); }
    /** Returns a chalk result with the color used in `logSystem.error`
     */
    errorColor(...text: unknown[]) { return chalk[this.getChalkMethod('E')](...text); }
    /** Returns a chalk result with the color used in `logSystem.success`
     */
    successColor(...text: unknown[]) { return chalk[this.getChalkMethod('S')](...text); }
    /** Returns a chalk result with the color used in `logSystem.loading`
     */
    loadingColor(...text: unknown[]) { return chalk[this.getChalkMethod('L')](...text); }
    /** Returns a chalk result with the color used in `logSystem.other`
     */
    otherColor(...text: unknown[]) { return chalk[this.getChalkMethod('O')](...text); }





    /** Creates a log with informative template
     * @param data - The data to be logged */
    info(...data: unknown[]) { this.log('I', false, ...data); }
    /** Creates a log with informative template. 
     * @note Not shown in the process terminal.
     * @param data - The data to be logged */
    infoh(...data: unknown[]) { this.log('I', true, ...data); }

    /** Creates a log with warning template. 
     * @param data - The data to be logged */
    warn(...data: unknown[]) { this.log('W', false, ...data); }
    /** Creates a log with warning template.
     * @note Not shown in the process terminal.
     * @param data - The data to be logged */
    warnh(...data: unknown[]) { this.log('W', true, ...data); }

    /** Creates a log with error template.
     * @param data - The data to be logged */
    error(...data: unknown[]) { this.log('E', false, ...data); }
    /** Creates a log with error template.
     * @note Not shown in the process terminal.
     * @param data - The data to be logged */
    errorh(...data: unknown[]) { this.log('E', true, ...data); }

    /** Creates a log with success template.
     * @param data - The data to be logged */
    success(...data: unknown[]) { this.log('S', false, ...data); }
    /** Creates a log with success template.
     * @note Not shown in the process terminal.
     * @param data - The data to be logged */
    successh(...data: unknown[]) { this.log('S', true, ...data); }

    /** Creates a log with loading template.
     * @param data - The data to be logged */
    loading(...data: unknown[]) { this.log('L', false, ...data); }
    /** Creates a log with loading template.
     * @note Not shown in the process terminal.
     * @param data - The data to be logged */
    loadingh(...data: unknown[]) { this.log('L', true, ...data); }

    /** Creates a log with generic template.
     * @param data - The data to be logged */
    other(...data: unknown[]) { this.log('O', false, ...data); }
    /** Creates a log with generic template.
     * @note Not shown in the process terminal.
     * @param data - The data to be logged */
    otherh(...data: unknown[]) { this.log('O', true, ...data); }







    /** This method creates a new log in the log file in addition to `console.log()` in the provided content. */
    log<Type extends LogType>(
        /** The type of log being passed:
         * 
         *      'I' for Info; 'W' for Warn; 'E' for Error; 'S' for Success; 'L' for 'Loading'; 'O' for Other
         */
        type: Type,
        /** `true` if you want to hide this log from the process terminal */
        terminalHidden: boolean,
        /** The data to be logged */
        ...data: unknown[]
    ) {
        const currentDate = new Date();
        const logMoment = Intl.DateTimeFormat('pt-br', { dateStyle: 'short', timeStyle: 'medium' }).format(currentDate).replace(', ', '-') + ':' + currentDate.getMilliseconds().toString().padStart(3, '0');




        // If it is the first log of the process, the log files are zeroed and the variable `firstOfProcess` is assigned as `false`
        if (this.firstOfProcess) {
            fs.mkdirSync('logs', { recursive: true });
            fs.writeFileSync('log.txt', '');
            fs.writeFileSync('log.ansi', '');
            this.firstOfProcess = false;
        }
        if (this.firstOfProcessForClient && this.client) {
            const sendNewSetOfLogsMessage = (channel: TextChannel | undefined) => channel?.send(`# Novo conjunto de logs: ${this.executionDateString}`);

            this.getLogChannel().then(sendNewSetOfLogsMessage);
            this.getLogChannel(true).then(sendNewSetOfLogsMessage);
            this.firstOfProcessForClient = false;
        }





        const typeName = this.getTypeName(type);
        const chalkMethod = this.getChalkMethod(type);
        const consoleMethod = this.getConsoleMethod(type);





        // Overwrites the `write` functions of the `stdout` and `stderr` outputs of the process to write this log in files and on Discord
        // @ts-expect-error Error because we are overwriting the function with another signature
        process.stdout.write = (chunk, encoding, callback) => {
            chunk = writeLogs.bind(this)(chunk);
            return terminalHidden ? undefined : originalStdoutWrite(chunk, encoding, callback);
        };
        // @ts-expect-error Error because we are overwriting the function with another signature
        process.stderr.write = (chunk, encoding, callback) => {
            chunk = writeLogs.bind(this)(chunk, true);
            return terminalHidden ? undefined : originalStderrWrite(chunk, encoding, callback);
        };






        lineLogger.bind(console[consoleMethod])(...data);



        // Restores the `write` functions but continue logging in files
        // @ts-expect-error some error
        process.stdout.write = (chunk, encoding, callback) => {
            writeLogFiles.bind(this)(chunk);

            return originalStdoutWrite(chunk, encoding, callback);
        };

        // @ts-expect-error some error
        process.stderr.write = (chunk, encoding, callback) => {
            writeLogFiles.bind(this)(chunk);

            return originalStderrWrite(chunk, encoding, callback);
        };






        /**
         * A logger that prints logs with a timestamp, type, and stack from the log call 
         * @param this The console method that will be used to print the log (like `console.log()` or `console.error()`)
         * @param data The data to be logged
         */
        function lineLogger(this: typeof console[typeof consoleMethod], ...data: unknown[]) {
            let err: Error;

            try {
                throw new Error();
            } catch (error: unknown) {
                err = error as Error;
            }

            try {
                const stacks = /(?:src|build)(?:\\|\/)([^)\n\r]+)\)?/g.exec(err.stack?.split('\n').slice(1).find((stack) => !stack.includes(__filename))?.trim() ?? '')?.[1];

                return this(`${chalk.gray('→')} [${chalk[chalkMethod](typeName)}][${chalk[chalkMethod](logMoment)}][${chalk[chalkMethod](stacks)}]:`, ...data);
            } catch (err: unknown) {
                return this(...data);
            }
        }



        /** Writes in the log files, and if available in the discord channels, the `chunk` content and returns a new `chunk`
         * @param chunk The content to be written in the log files
         * @param stderr If `true`, the content will be written in the `stderr` file
         */
        function writeLogs(this: LogSystem, chunk: string | Uint8Array, stderr?: boolean) {
            if (typeof chunk !== 'string') return chunk;



            // Colors all occurrences `#(abcde...)#` or `#c(abcde...)#` with a `chalk[chalkMethod](abcde...)`
            let oldChunk = '';
            while (oldChunk !== chunk) {
                oldChunk = chunk;

                chunk = chunk
                    .replace(/(?<!\\)#(d|i|w|e|s|l|o|g)?\((((?<!\)#).(?!(?:#(d|i|w|e|s|l|o|g)?\()))+)\)#/g, (_match, a, b,) => chalk[a ? this.getChalkMethod(a.toUpperCase()) : chalkMethod](b));
            }


            // Indents unknown content of the chunk
            chunk = chunk.replace(/\n(.)/g, '\n    $1');
            chunk = chunk.replace(/\r(.)/g, '\r    $1');

            /** An array with all line breaks found in the `chunk` */
            const chunkLineWraps = (chunk as string).match(/(\n|\r)/g) ?? [];

            // If the chunk has more than 4 line breaks, a line is added at the end
            if (chunkLineWraps.length > 4) chunk = chunk + `[${chalk[chalkMethod]('----------------------------------------------------------')}]\n`;



            writeLogFiles.bind(this)(chunk);



            /** `PT`: Envia no canal do Discord fornecido a mensagem de log
             * @param chunk The content to be written in the log channel
             * @param stderr If `true`, the content will be written with mentions for the admins
             */
            writeLogDiscord.bind(this)(chunk, stderr);


            return chunk;
        }



        /** `PT`: Escreve nos arquivos de log apenas */
        function writeLogFiles(this: LogSystem, chunk: string | Uint8Array) {
            if (typeof chunk !== 'string') return;

            fs.appendFileSync('log.txt', stripAnsi(chunk));
            fs.appendFileSync('log.ansi', chunk);
            fs.writeFileSync(`logs/log-${this.executionDateString}.txt`, fs.readFileSync('log.txt'));
            fs.writeFileSync(`logs/log-${this.executionDateString}.ansi`, fs.readFileSync('log.ansi'));
        }


        function writeLogDiscord(this: LogSystem, chunk: string | Uint8Array, stderr?: boolean) {
            if (typeof chunk !== 'string') return;

            const sendLogMessage = (channel: TextChannel | undefined) => {
                const chunkContent = chunk.length <= 1950 ? (chunk as string) : stripAnsi(chunk as string);

                channel?.send({
                    content: `${(stderr && this.client?.admins.map((adminId) => `<@${adminId}>`).join(' ')) || ''}\`\`\`ansi\n${(chunkContent.length > 1950 ? chunk : chunkContent).slice(0, 1950)}\n\`\`\``,
                    files: chunk.length > 1950 ?
                        [
                            new AttachmentBuilder(
                                Buffer.from(chunk).length < 25 * 1000 * 1000 ?
                                    Buffer.from(chunk) :
                                    Buffer.from('LOG TOO LARGE!' /* + ' LOG FILE WILL BE SENT BY EMAIL' */),
                                { name: `log-${Date.now()}.ansi` }
                            ),
                            new AttachmentBuilder(
                                Buffer.from(stripAnsi(chunk as string)).length < 25 * 1000 * 1000 ?
                                    Buffer.from(stripAnsi(chunk as string)) :
                                    Buffer.from('LOG TOO LARGE!' /* + ' LOG FILE WILL BE SENT BY EMAIL' */),
                                { name: `log-${Date.now()}.txt` }
                            ),
                        ] : undefined
                }).catch(() => 0);
            };




            // `PT`: Obtem os canais de log padrão e envia o log como mensagem
            !terminalHidden && this.getLogChannel().then(sendLogMessage);
            this.getLogChannel(true).then(sendLogMessage);
        }
    }




    /** @param full If `true`, the full log channel will be returned */
    private async getLogChannel(full?: boolean) {
        if (!this.client) return;

        const logChannel = await this.client.channels.fetch(process.env[full ? 'FULL_LOG_CHANNEL_ID' : 'LOG_CHANNEL_ID']!);
        if (!logChannel?.isTextBased() || logChannel.type !== ChannelType.GuildText) throw new Error((full ? 'Full ' : '') + 'Log channel is not a TextChannel');

        return logChannel;
    }




    private getTypeName<Type extends LogType>(type: Type) {
        if (type === 'I') return 'i';
        else if (type === 'E') return 'x';
        else if (type === 'W') return '!';
        else if (type === 'S') return '✓';
        else if (type === 'L') return '⋰';
        else if (type === 'O') return '•';
        return 'i';
    }
    private getChalkMethod<Type extends LogType | 'D' | 'G'>(type: Type) {
        if (type === 'D') return 'reset';
        else if (type === 'I') return 'cyan';
        else if (type === 'E') return 'red';
        else if (type === 'W') return 'yellow';
        else if (type === 'S') return 'green';
        else if (type === 'L') return 'blue';
        else if (type === 'O') return 'inverse';
        else if (type === 'G') return 'gray';
        return 'cyan';
    }
    private getConsoleMethod<Type extends LogType>(type: Type) {
        if (type === 'I') return 'info';
        else if (type === 'E') return 'error';
        else if (type === 'W') return 'warn';
        else if (type === 'S') return 'log';
        else if (type === 'L') return 'log';
        else if (type === 'O') return 'log';
        return 'info';
    }
}





/** `PT`: Altera algumas configurações default do `console.log()` */
function configInspectDefaultOptions() {
    util.inspect.defaultOptions.depth = 7;
    util.inspect.defaultOptions.maxArrayLength = 500;
}

export const log = new LogSystem();
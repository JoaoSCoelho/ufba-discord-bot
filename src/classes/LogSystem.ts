/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import util from 'util';
import LocalClient from './LocalClient';
import { AttachmentBuilder, ChannelType, TextChannel } from 'discord.js';


type LogType = 'I' | 'W' | 'E' | 'S' | 'L' | 'O';




configInspectDefaultOptions();

/** `PT`: Guarda a função original `process.stdout.write` */
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);


export default class LogSystem {
    /** `PT`: Informa se é o primeiro log do processo atual. Essa variável vai receber `false` assim que qualquer função de log for acionada */
    private firstOfProcess = true;

    /** `PT`: Informa se é o primeiro log do processo atual desde que o client está disponível. Essa variável vai receber `false` assim que qualquer função de log for acionada com o client disponível */
    private firstOfProcessForClient = true;


    /** 
     * @description `PT`: Salva uma data quando uma instância é gerada 
     * @format (XX-XX-XXXX--XX-XX-XX) '`DAY`-`MONTH`-`YEAR`--`HOURS`-`MINUTES`-`SECONDS`'
     */
    private executionDate: `${string}-${string}-${number}--${string}-${string}-${string}`;


    client: LocalClient | undefined;




    constructor() {
        this.executionDate = `${new Date().getDate().toString().padStart(2, '0')}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getFullYear()}--${new Date().getHours().toString().padStart(2, '0')}-${new Date().getMinutes().toString().padStart(2, '0')}-${new Date().getSeconds().toString().padStart(2, '0')}`;
    }



    /** `PT`: Quando executada, seta um client no `LogSystem` e permite que o `client` envie logs em algum canal apropriado */
    clientReady(client: LocalClient) {
        this.client = client;
    }




    /** `PT`: Retorna um resultado chalk com a cor usada no `logSystem.info` */
    infoColor(...text: unknown[]) { return chalk[this.getChalkMethod('I')](...text); }
    /** `PT`: Retorna um resultado chalk com a cor usada no `logSystem.warn` */
    warnColor(...text: unknown[]) { return chalk[this.getChalkMethod('W')](...text); }
    /** `PT`: Retorna um resultado chalk com a cor usada no `logSystem.error` */
    errorColor(...text: unknown[]) { return chalk[this.getChalkMethod('E')](...text); }
    /** `PT`: Retorna um resultado chalk com a cor usada no `logSystem.success` */
    successColor(...text: unknown[]) { return chalk[this.getChalkMethod('S')](...text); }
    /** `PT`: Retorna um resultado chalk com a cor usada no `logSystem.loading` */
    loadingColor(...text: unknown[]) { return chalk[this.getChalkMethod('L')](...text); }
    /** `PT`: Retorna um resultado chalk com a cor usada no `logSystem.other` */
    otherColor(...text: unknown[]) { return chalk[this.getChalkMethod('O')](...text); }





    /** `PT`: Cria um log com template informativo @param data - The data to be logged */
    info(...data: any[]) { this.log('I', false, ...data); }
    /** `PT`: Cria um log com template informativo. *Não é mostrado no terminal do processo. @param data - The data to be logged */
    infoh(...data: any[]) { this.log('I', true, ...data); }

    /** `PT`: Cria um log com template de aviso. @param data - The data to be logged */
    warn(...data: any[]) { this.log('W', false, ...data); }
    /** `PT`: Cria um log com template de aviso. *Não é mostrado no terminal do processo. @param data - The data to be logged */
    warnh(...data: any[]) { this.log('W', true, ...data); }

    /** `PT`: Cria um log com template de erro. @param data - The data to be logged */
    error(...data: any[]) { this.log('E', false, ...data); }
    /** `PT`: Cria um log com template de erro. *Não é mostrado no terminal do processo. @param data - The data to be logged */
    errorh(...data: any[]) { this.log('E', true, ...data); }

    /** `PT`: Cria um log com template de sucesso. @param data - The data to be logged */
    success(...data: any[]) { this.log('S', false, ...data); }
    /** `PT`: Cria um log com template de sucesso. *Não é mostrado no terminal do processo. @param data - The data to be logged */
    successh(...data: any[]) { this.log('S', true, ...data); }

    /** `PT`: Cria um log com template de carregamento. @param data - The data to be logged */
    loading(...data: any[]) { this.log('L', false, ...data); }
    /** `PT`: Cria um log com template de carregamento. *Não é mostrado no terminal do processo. @param data - The data to be logged */
    loadingh(...data: any[]) { this.log('L', true, ...data); }

    /** `PT`: Cria um log com template genérico. @param data - The data to be logged */
    other(...data: any[]) { this.log('O', false, ...data); }
    /** `PT`: Cria um log com template genérico. *Não é mostrado no terminal do processo. @param data - The data to be logged */
    otherh(...data: any[]) { this.log('O', true, ...data); }







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
        ...data: any[]
    ) {
        const currentDate = new Date();
        const logMoment = Intl.DateTimeFormat('pt-br', { dateStyle: 'short', timeStyle: 'medium' }).format(currentDate).replace(', ', '-') + ':' + currentDate.getMilliseconds().toString().padStart(3, '0');




        // `PT`: Se for o primeiro log do processo, os arquivos de log são zerados e a variável `firstOfProcess` é atribuida como `false`
        if (this.firstOfProcess) {
            fs.mkdirSync('logs', { recursive: true });
            fs.writeFileSync('log.txt', '');
            fs.writeFileSync('log-ansi.txt', '');
            this.firstOfProcess = false;
        }
        if (this.firstOfProcessForClient && this.client) {
            const sendNewSetOfLogsMessage = (channel: TextChannel | undefined) => channel?.send(`# Novo conjunto de logs: ${this.executionDate}`);

            this.getLogChannel().then(sendNewSetOfLogsMessage);
            this.getLogChannel(true).then(sendNewSetOfLogsMessage);
            this.firstOfProcessForClient = false;
        }





        const typeName = this.getTypeName(type);
        const chalkMethod = this.getChalkMethod(type);
        const consoleMethod = this.getConsoleMethod(type);





        // `PT`: Sobrescreve as funções `write` das saídas `stdout` e `stderr` do processo
        // @ts-expect-error some error
        process.stdout.write = (chunk, encoding, callback) => {
            chunk = writeLogs.bind(this)(chunk);
            return terminalHidden ? undefined : originalStdoutWrite(chunk, encoding, callback);
        };
        // @ts-expect-error some error
        process.stderr.write = (chunk, encoding, callback) => {
            chunk = writeLogs.bind(this)(chunk, true);
            return terminalHidden ? undefined : originalStderrWrite(chunk, encoding, callback);
        };



        function lineLogger(this: typeof console[typeof consoleMethod], ...data: unknown[]) {
            let err: Error;

            try {
                throw new Error();
            } catch (error) {
                err = error as Error;
            }

            try {
                const stacks = /src\\([^)\n\r]+)\)?/g.exec(err.stack?.split('\n').slice(1).find((stack) => !stack.includes(__filename))?.trim() ?? '')?.[1];
                
                return this(`${chalk[chalkMethod]('>')} [${chalk[chalkMethod](typeName)}] [${chalk[chalkMethod](logMoment)}] [${chalk[chalkMethod](stacks)}]:`, ...data);
            } catch (err) {
                return this(...data);
            }
        }

        lineLogger.bind(console[consoleMethod])(...data);





        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;










        /** `PT`: Escreve nos arquivos de log, e se disponível nos canais do discord, o conteúdo `chunk` e retorna um novo `chunk` */
        function writeLogs(this: LogSystem, chunk: string | Uint8Array, stderr?: boolean) {
            if (typeof chunk === 'string') {

                // `PT`: Faz a colorização de todas as ocorrências `#(abcde...)` ou `#c(abcde...)` com um `chalk[chalkMethod](abcde...)`
                let oldChunk = '';
                while (oldChunk !== chunk) {
                    oldChunk = chunk;

                    chunk = chunk
                        .replace(/(?<!\\)#(d|i|w|e|s|l|o)?\((((?<!\)#).(?!(?:#(d|i|w|e|s|l|o)?\()))+)\)#/g, (_match, a, b) => chalk[a ? this.getChalkMethod(a) : chalkMethod](b));
                }


                // `PT`: Da um nível de identação para qualquer conteúdo do chunk
                chunk = chunk.replace(/\n(.)/g, '\n    $1');
                chunk = chunk.replace(/\r(.)/g, '\r    $1');

                /** `PT`: Um array com todas as quebras de linhas encontradas no `chunk` */
                const chunkLineWraps = (chunk as string).match(/(\n|\r)/g) ?? [];

                // `PT`: Se o chunk tiver mais de 4 quebras de linha, uma linhas é adicionada ao final
                if (chunkLineWraps.length > 4) chunk = chunk + `[${chalk[chalkMethod]('----------------------------------------------------------')}]\n`;



                // `PT`: Escreve nos arquivos de log
                fs.appendFileSync('log.txt', stripAnsi(chunk));
                fs.appendFileSync('log-ansi.txt', chunk);
                fs.writeFileSync(`logs/log-${this.executionDate}.txt`, fs.readFileSync('log.txt'));
                fs.writeFileSync(`logs/log-ansi-${this.executionDate}.txt`, fs.readFileSync('log-ansi.txt'));



                /** `PT`: Envia no canal do Discord fornecido a mensagem de log */
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
                                    { name: `log-${Date.now()}.txt` }
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

            return chunk;
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
        if (type === 'I') return 'ⓘ';
        else if (type === 'E') return 'ⓧ';
        else if (type === 'W') return '⚠';
        else if (type === 'S') return '✓';
        else if (type === 'L') return '↻';
        else if (type === 'O') return '㏒';
        return 'INFO';
    }
    private getChalkMethod<Type extends LogType | 'D'>(type: Type) {
        if (type === 'D') return 'reset';
        else if (type === 'I') return 'cyan';
        else if (type === 'E') return 'red';
        else if (type === 'W') return 'yellow';
        else if (type === 'S') return 'green';
        else if (type === 'L') return 'blue';
        else if (type === 'O') return 'inverse';
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
    util.inspect.defaultOptions.numericSeparator = true;
}
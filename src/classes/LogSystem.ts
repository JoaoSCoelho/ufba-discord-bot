/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import util from 'util';
import LocalClient from './LocalClient';

configInspectDefaultOptions();

/** `PT`: Guarda a função original `process.stdout.write` */
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);


export default class LogSystem {
    /** `PT`: Informa se é o primeiro log do processo atual. Essa variável vai receber `false` assim que qualquer função de log for acionada */
    private firstOfProcess = true;


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

    /** @param data - The data to be logged */
    info(...data: any[]) {
        this.log('I', false, ...data); 
    }
    /** @param data - The data to be logged */
    infoh(...data: any[]) {
        this.log('I', true, ...data); 
    }

    /** @param data - The data to be logged */
    warn(...data: any[]) {
        this.log('W', false, ...data); 
    }
    /** @param data - The data to be logged */
    warnh(...data: any[]) {
        this.log('W', true, ...data); 
    }

    /** @param data - The data to be logged */
    error(...data: any[]) {
        this.log('E', false, ...data); 
    }
    /** @param data - The data to be logged */
    errorh(...data: any[]) {
        this.log('E', true, ...data); 
    }

    /** @param data - The data to be logged */
    success(...data: any[]) {
        this.log('S', false, ...data); 
    }
    /** @param data - The data to be logged */
    successh(...data: any[]) {
        this.log('S', true, ...data); 
    }

    /** @param data - The data to be logged */
    loading(...data: any[]) {
        this.log('L', false, ...data); 
    }
    /** @param data - The data to be logged */
    loadingh(...data: any[]) {
        this.log('L', true, ...data); 
    }

    /** @param data - The data to be logged */
    other(...data: any[]) {
        this.log('O', false, ...data); 
    }
    /** @param data - The data to be logged */
    otherh(...data: any[]) {
        this.log('O', true, ...data); 
    }

    /** This method creates a new log in the log file in addition to `console.log()` in the provided content. */
    log<Type extends 'I' | 'W' | 'E' | 'S' | 'L' | 'O'>(
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
        const logMoment = Intl.DateTimeFormat('pt-br', { dateStyle: 'short', timeStyle: 'medium' }).format(currentDate) + ':' + currentDate.getMilliseconds();
    
        // `PT`: Se for o primeiro log do processo, os arquivos de log são zerados e a variável `firstOfProcess` é atribuida como `false`
        if (this.firstOfProcess) {
            fs.mkdirSync('logs', { recursive: true });
            fs.writeFileSync('log.txt', '');
            fs.writeFileSync('log-ansi.txt', '');
            this.firstOfProcess = false;
        }
    
        const typeName: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'LOADING...' | 'OTHER' = getTypeName(type);
        const chalkMethod: 'cyan' | 'red' | 'yellow' | 'green' | 'blue' | 'inverse' = getChalkMethod(type);
        const consoleMethod: 'info' | 'warn' | 'error' | 'log' = getConsoleMethod(type);
    
        // `PT`: Sobrescreve as funções `write` das saídas `stdout` e `stderr` do processo
        // @ts-expect-error some error
        process.stdout.write = (chunk, encoding, callback) => {
            chunk = writeLogs.bind(this)(chunk);
            return terminalHidden ? undefined : originalStdoutWrite(chunk, encoding, callback);
        };
        // @ts-expect-error some error
        process.stderr.write = (chunk, encoding, callback) => {
            chunk = writeLogs.bind(this)(chunk);
            return terminalHidden ? undefined : originalStderrWrite(chunk, encoding, callback);
        };
    
        console[consoleMethod](`${chalk[chalkMethod]('>')}${type === 'L' ? ` [${chalk[chalkMethod]('↻')}]` : ''} [${chalk[chalkMethod](typeName)}] [${chalk[chalkMethod](logMoment)}]:`, ...data);
    
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    
        /** `PT`: Escreve nos arquivos de log o conteúdo `chunk` e retorna um novo `chunk` */
        function writeLogs(this: LogSystem, chunk: string | Uint8Array) {
            if (typeof chunk === 'string') {
                // `PT`: Da um nível de identação para qualquer conteúdo do chunk
                chunk = chunk.replace(/\n(.)/g, '\n    $1');
                chunk = chunk.replace(/\r(.)/g, '\r    $1');
    
                const chunkLineWraps = (chunk as string).match(/(\n|\r)/g) ?? [];
    
                // `PT`: Se o chunk tiver mais de 4 quebras de linha, uma linhas é adicionada ao final
                if (chunkLineWraps.length > 4) chunk = chunk + `[${chalk[chalkMethod]('----------------------------------------------------------')}]\n`;
    
                fs.appendFileSync('log.txt', stripAnsi(chunk));
                fs.appendFileSync('log-ansi.txt', chunk);
                fs.writeFileSync(`logs/log-${this.executionDate}.txt`, fs.readFileSync('log.txt'));
                fs.writeFileSync(`logs/log-ansi-${this.executionDate}.txt`, fs.readFileSync('log-ansi.txt'));
            }
    
            return chunk;
        }
    
        function getTypeName(type: Type) {
            if (type === 'I') return 'INFO';
            else if (type === 'E') return 'ERROR';
            else if (type === 'W') return 'WARN';
            else if (type === 'S') return 'SUCCESS';
            else if (type === 'L') return 'LOADING...';
            else if (type === 'O') return 'OTHER';
            return 'INFO';
        }
        function getChalkMethod(type: Type) {
            if (type === 'I') return 'cyan';
            else if (type === 'E') return 'red';
            else if (type === 'W') return 'yellow';
            else if (type === 'S') return 'green';
            else if (type === 'L') return 'blue';
            else if (type === 'O') return 'inverse';
            return 'cyan';
        }
        function getConsoleMethod(type: Type) {
            if (type === 'I') return 'info';
            else if (type === 'E') return 'error';
            else if (type === 'W') return 'warn';
            else if (type === 'S') return 'log';
            else if (type === 'L') return 'log';
            else if (type === 'O') return 'log';
            return 'info';
        }
    }
}





/** `PT`: Altera algumas configurações default do `console.log()` */
function configInspectDefaultOptions() {
    util.inspect.defaultOptions.depth = null;
    util.inspect.defaultOptions.maxArrayLength = null;
    util.inspect.defaultOptions.maxStringLength = null;
    util.inspect.defaultOptions.numericSeparator = true;
    util.inspect.defaultOptions.showProxy = true;
}
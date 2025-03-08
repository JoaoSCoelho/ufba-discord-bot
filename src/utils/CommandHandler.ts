// File Version: 0.0.3

import * as path from 'path';
import * as fs from 'fs';
import SlashCommand from '../classes/SlashCommand';
import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import AdminCommand from '../classes/AdminCommand';
import { log } from '../classes/LogSystem';
import { client } from '..';
import BaseError from '../Errors/BaseError';
import HandledError from '../Errors/HandledError';

export default class CommandHandler {
    /** Controls whether when the commandHandler is being executed, the deployment of commands on discord should also be executed */
    public readonly shouldDeploy: boolean;

    public constructor(shouldDeploy: boolean = process.env.DEPLOY === 'true') {
        this.shouldDeploy = shouldDeploy;
    }

    /** Maps all the commands in the directories `'/commands'`|`'/admin_commands'` and puts them in the attributes `.commands`|`.adminCommands` of the client
     * @param sync If `true`, the commands will be handled synchronously, one after the other.
     */
    public async handleAllCommands(sync: boolean = false) {
        if (sync) {
            await this.handleCommands();
            await this.handleAdminCommands();
        } else {
            this.handleCommands();
            this.handleAdminCommands();
        }
    }

    /** Sets in `client.commands` all the commands in the `/commands` folder
     */
    public async handleCommands() {
        const commandsToDeploy: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
        /** Like `C:/user/bot/src/commands` */
        const commandsPath = path.join(__dirname, '../commands');
        /** Like `[ 'command1', 'command2', ... ]` */
        const commandsFolders = fs.readdirSync(commandsPath);


        for (const commandFolder of commandsFolders) {
            /** Like `C:/user/bot/src/commands/command1` */
            const commandPath = path.join(commandsPath, commandFolder);
            const indexFile = fs.readdirSync(commandPath).find((file) => file === 'index.js' || file === 'index.ts');

            // If the command does not have an index file, it will not be registered
            if (!indexFile) {
                log.warn(`Comando em (#(${commandPath}/)#) não possui arquivo #(index)#.`);
                continue;
            }

            /** Like `C:/user/bot/src/commands/command1/index.ts` */
            const indexFilePath = path.join(commandPath, indexFile);
            let Command: typeof SlashCommand;

            try {
                Command = await this.importCommandInPath(indexFilePath, SlashCommand);
            } catch (error: unknown) {
                if (!BaseError.isHandled(error)) {
                    log.error(`Erro ao importar o comando em (#(${indexFilePath})#):`,
                        '\n#(Erro)#:', error);

                    BaseError.handle(error);
                }

                continue; // Ignore this command if could not be imported
            }

            client.commands.set(Command.data.name, Command);
            log.successh(`Comando #(${Command.data.name})# (#(${indexFilePath})#) cadastrado com sucesso.`);


            if (this.shouldDeploy) {
                commandsToDeploy.push(Command.data.toJSON());
                log.info(`Comando #(${Command.data.name})# (#(${indexFilePath})#) cadastrado para deploy.`);
            }
        }


        log.successh(`#(${client.commands.size})# comandos cadastrados com sucesso.`);

        if (this.shouldDeploy) await this.deployCommands(commandsToDeploy)
            .catch((error: unknown) => {
                if (!BaseError.isHandled(error)) {
                    log.error('Erro enquanto estava sendo feito o deploy dos comandos no discord:',
                        '\n#(Erro)#:', error
                    );

                    BaseError.handle(error);
                }

                throw error ?? new HandledError('Unknown error while deploying the commands in discord');
            });
    }

    /** Sets in `client.adminCommands` all the commands in the `/admin-commands` folder
    */
    public async handleAdminCommands() {
        /** Like `C:/user/bot/src/admin-commands` */
        const commandsPath = path.join(__dirname, '../admin-commands');
        const commandsFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


        for (const commandFile of commandsFiles) {
            /** Like `C:/user/bot/src/admin-commands/command1.ts` */
            const filePath = path.join(commandsPath, commandFile);
            let Command: typeof AdminCommand;

            try {
                Command = await this.importCommandInPath(filePath, AdminCommand);
            } catch (error: unknown) {
                if (!BaseError.isHandled(error)) {
                    log.error(`Erro ao importar o comando de admin em (#(${filePath})#):`,
                        '\n#(Erro)#:', error);

                    BaseError.handle(error);
                }

                continue; // Ignore this command if could not be imported
            }

            client.adminCommands.set(Command.data.name, Command);
            log.successh(`Comando de admin #(${Command.data.name})# (#(${commandFile})#) cadastrado com sucesso.`);
        }

        log.successh(`#(${client.adminCommands.size})# comandos de #(admin)# cadastrados com sucesso.`);
    }

    /** Deploys the commands to the Discord API (to show them in the Discord UI)
     * @param commands The array of commands to deploy
     */
    public async deployCommands(commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]) {
        const rest = new REST().setToken(process.env.TOKEN!);

        try {
            log.loading(`Começando a atualizar #(${commands.length})# comandos (#(/)#) no Discord.`);

            // The PUT method is used to fully refresh all commands with the current set
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID!),
                { body: commands },
            ) as SlashCommand[];

            log.success(`#(${data.length})# comandos (#(/)#) atualizados com sucesso no Discord.\n`,
                `${commands.map((command, index) => `${index + 1}º #(${command.name})#`).join('#g(, )#')}`);
        } catch (error: unknown) {
            if (!BaseError.isHandled(error)) {
                log.error('Aconteceu um erro enquanto estava sendo feito o deploy dos comandos no discord:',
                    '\n#(Erro)#:', error
                );

                BaseError.handle(error);
            }

            throw error;
        }
    }

    /** Make a import in the specified path and guarantees that the imported command is a typeof SlashCommand or AdminCommand
     * @param path The path of the command
     * @param type The type of the command (typeof SlashCommand or typeof AdminCommand)
     * @returns The imported command
     * @throws HandledError('Unknown error while importing the command file')
     * @throws HandledError('The command was not imported correctly')
     * @throws HandledError('The command does not have a default export')
     * @throws HandledError('The command is not a class')
     * @throws HandledError('The command is not an subclass of SlashCommand/AdminCommand') 
    */
    private async importCommandInPath<Type extends typeof SlashCommand | typeof AdminCommand>(path: string, type: Type) {
        const module: unknown = await import(path)
            .catch((error: unknown) => {
                log.error(`Erro ao importar o arquivo do comando em (#(${path})#):`,
                    '\n#(Erro)#:', error);
                BaseError.handle(error);

                throw error ?? new HandledError('Unknown error while importing the command file');
            });



        if (!module || typeof module !== 'object') {
            log.error(`O comando em (#(${path})#) nao foi importado corretamente.`,
                `\n#(Esperado)#: { default: class ${type.name} }`,
                '\n#(Recebido)#:', module
            );
            throw new HandledError('The command was not imported correctly');
        }
        if (!('default' in module)) {
            log.warn(`O comando em (#(${path})#) nao tem exportação padrão.`,
                `\n#(Esperado)#: { default: class ${type.name} }`,
                '\n#(Recebido)#:', module
            );
            throw new HandledError('The command does not have a default export');
        }

        if (typeof module.default !== 'function' || !('prototype' in module.default)) {
            log.warn(`O comando em (#(${path})#) nao é uma classe.`,
                `\n#(Esperado)#: { default: class ${type.name} }`,
                '\n#(Recebido)#:', module
            );
            throw new HandledError('The command is not a class');
        }
        // Check if the supposed command is a child class of the expected type
        if (!(module.default.prototype instanceof type)) {
            log.warn(`O comando em (#(${path})#) não é uma subclasse de #(${type.name})#.`);
            throw new HandledError(`The command is not a subclass of ${type.name}`);
        };

        return module.default as Type;
    }
}
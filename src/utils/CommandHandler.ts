// File Version: 0.0.1

import * as path from 'path';
import * as fs from 'fs';
import SlashCommand from '../classes/Command';
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

    /** Maps all the commands in the directories `'/commands/[type]'`|`'/admin_commands'` and puts them in the attributes `.commands`|`.adminCommands` of the client
     * @param sync If true, the commands will be handled synchronously
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
        const commandsPath = path.join(__dirname, '../commands');
        const commandsFolder = fs.readdirSync(commandsPath);

        for (const categoryFolder of commandsFolder) {
            const commandsCategoryPath = path.join(commandsPath, categoryFolder);
            const commandsCategoryFolder = fs.readdirSync(commandsCategoryPath, { withFileTypes: true }).filter((dir) => dir.isDirectory());


            for (const commandFolder of commandsCategoryFolder) {
                const commandPath = path.join(commandsCategoryPath, commandFolder.name);
                const indexFile = fs.readdirSync(commandPath).find((file) => file === 'index.js' || file === 'index.ts');

                // If the command does not have an index file, it will not be registered
                if (!indexFile) {
                    log.warn(`Comando em (#(${categoryFolder}/${commandFolder.name}/)#) não possui arquivo #(index)#`);
                    continue;
                }

                const indexFilePath = path.join(commandPath, indexFile);
                let command: SlashCommand;

                try {
                    command = await this.importCommandInPath(indexFilePath, SlashCommand);
                } catch (error: unknown) {
                    if (!BaseError.isHandled(error)) {
                        log.error(`Erro ao importar o comando em (#(${categoryFolder}/${commandFolder.name}/${indexFile})#):`,
                            '\n#(Erro)#:', error);

                        BaseError.handle(error);
                    }

                    continue; // Ignore this command
                }

                client.commands.set(command.data.name, command);
                log.successh(`Comando #(${command.data.name})# (#(${categoryFolder}/${commandFolder.name}/${indexFile})#) cadastrado com sucesso`);


                if (this.shouldDeploy) {
                    commandsToDeploy.push(command.data.toJSON());
                    log.info(`Comando #(${command.data.name})# (#(${categoryFolder}/${commandFolder.name}/${indexFile})#) cadastrado para deploy`);
                }
            }
        }

        log.successh(`#(${client.commands.size})# comandos cadastrados com sucesso`);

        if (this.shouldDeploy) await this.deployCommands(commandsToDeploy)
            .catch((error: unknown) => {
                if (!BaseError.isHandled(error)) {
                    log.error('Erro enquanto estava sendo feito o deploy dos comandos no discord',
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
        const commandsPath = path.join(__dirname, '../admin-commands');
        const commandsFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


        for (const commandFile of commandsFiles) {
            const filePath = path.join(commandsPath, commandFile);
            let command: AdminCommand;

            try {
                command = await this.importCommandInPath(filePath, AdminCommand);
            } catch (error: unknown) {
                if (!BaseError.isHandled(error)) {
                    log.error(`Erro ao importar o comando de admin em (#(${filePath})#):`,
                        '\n#(Erro)#:', error);

                    BaseError.handle(error);
                }

                continue; // Ignore this command
            }

            client.adminCommands.set(command.data.name, command);
            log.successh(`Comando de admin #(${command.data.name})# (#(${commandFile})#) cadastrado com sucesso`);
        }

        log.successh(`#(${client.adminCommands.size})# comandos de #(admin)# cadastrados com sucesso`);
    }

    /** Deploys the commands to the Discord API (to show them in the Discord UI)
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
                log.error('Aconteceu um erro enquanto estava sendo feito o deploy dos comandos no discord',
                    '\n#(Erro)#:', error
                );

                BaseError.handle(error);
            }

            throw error;
        }
    }

    /** Make a import in the specified path and guarantees that the imported command is a SlashCommand or AdminCommand
     * @param path The path of the command
     * @param type The type of the command (SlashCommand or AdminCommand)
     * @returns The imported command
     * @throws HandledError('Unknown error while importing the command)
     * @throws HandledError('The command was not imported correctly')
     * @throws HandledError('The command does not have a default export')
     * @throws HandledError('The command is not an instance of SlashCommand')
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
            log.error(`O comando em (#(${path})#) nao foi importado corretamente`,
                '\n#(Esperado)#: { default: SlashCommand }',
                '\n#(Recebido)#:', module
            );
            throw new HandledError('The command was not imported correctly');
        }
        if (!('default' in module)) {
            log.warn(`O comando em (#(${path})#) nao tem exportação padrão`,
                '\n#(Esperado)#: { default: SlashCommand }',
                '\n#(Recebido)#:', module
            );
            throw new HandledError('The command does not have a default export');
        }

        // Check if the supposed command is a Command instance
        if (!(module.default instanceof type)) {
            log.warn(`O comando em (#(${path})#) não é uma instância de #(${type.name})#.`);
            throw new HandledError(`The command is not an instance of ${type.name}`);
        }

        return module.default as InstanceType<Type>;
    }
}
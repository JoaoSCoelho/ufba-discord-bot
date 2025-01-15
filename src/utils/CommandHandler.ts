import * as path from 'path';
import * as fs from 'fs';
import SlashCommand from '../classes/Command';
import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import AdminCommand from '../classes/AdminCommand';
import { log } from '../classes/LogSystem';
import { client } from '..';

export default class CommandHandler {
    /** Controls whether when the commandHandler is being executed, the deployment of commands on discord should also be executed */
    public readonly shouldDeploy: boolean;

    constructor(shouldDeploy: boolean = process.env.DEPLOY === 'true') {
        this.shouldDeploy = shouldDeploy;
    }

    /** Maps all the commands in the directories `'/commands/[type]'`|`'/admin_commands'` and puts them in the attributes `.commands`|`.adminCommands` of the client
     * @param sync If true, the commands will be handled synchronously
     */
    async handleAllCommands(sync: boolean = false) {
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
    async handleCommands() {
        const commandsToDeploy: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
        const commandsPath = path.join(__dirname, 'commands');
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
                const command: SlashCommand = (await import(indexFilePath))?.default;

                // Check if the supposed command is a Command instance
                if (!(command instanceof SlashCommand)) {
                    log.warn(`O comando em (#(${categoryFolder}/${commandFolder.name}/${indexFile})#) não é uma instância de #(SlashCommand)#.`);
                    continue;
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

        this.shouldDeploy && this.deployCommands(commandsToDeploy);
    }

    /** Sets in `client.adminCommands` all the commands in the `/admin-commands` folder
    */
    async handleAdminCommands() {
        const commandsPath = path.join(__dirname, 'admin-commands');
        const commandsFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


        for (const commandFile of commandsFiles) {
            const filePath = path.join(commandsPath, commandFile);
            const command = (await import(filePath))?.default;


            // Check if the supposed admin command is a AdminCommand instance
            if (!(command instanceof AdminCommand)) {
                log.warn(`O comando de admin em #(${(commandFile)})# não é uma instância de #(AdminCommand)#.`);
                continue;
            }

            client.adminCommands.set(command.data.name, command);

            log.successh(`Comando de admin #(${command.data.name})# (#(${commandFile})#) cadastrado com sucesso`);

        }

        log.successh(`#(${client.adminCommands.size})# comandos de admin cadastrados com sucesso`);
    }

    /** Deploys the commands to the Discord API (to show them in the Discord UI)
     */
    public async deployCommands(commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]) {
        const rest = new REST().setToken(process.env.TOKEN!);

        try {
            log.loading(`Started refreshing #(${commands.length})# application (/) commands.`);

            // The PUT method is used to fully refresh all commands with the current set
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID!),
                { body: commands },
            ) as SlashCommand[];

            log.success(`Successfully reloaded #(${data.length})# application (/) commands.\n`,
                `${commands.map((command, index) => `#g(${index + 1}º)# ${command.name}`).join('#g(, )#')}`);
        } catch (error) {
            log.error('Aconteceu um erro enquanto estava sendo feito o deploy dos comandos no discord', error);
        }
    }
}
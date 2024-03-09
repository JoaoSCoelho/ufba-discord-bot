import * as path from 'path';
import * as fs from 'fs';
import Command from './classes/Command';
import LocalClient from './classes/LocalClient';
import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import AdminCommand from './classes/AdminCommand';
import { log } from './classes/LogSystem';

/** Controls whether when the commandHandler is being executed, the deployment of commands on discord should also be executed */
const shouldDeploy = process.env.DEPLOY === 'true';
const commandsToDeploy: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

/** `PT`: Seta em `client.commands` e na constante `commandsToDeploy` todos os comandos da pasta `/commands` */
export default async function commandHandler(client: LocalClient) {

    /** `PT`: O caminho da pasta `/commands` */
    const foldersPath = path.join(__dirname, 'commands');
    /** `PT`: String com todos os diretórios da pasta `/commands` */
    const commandsFolder = fs.readdirSync(foldersPath);

    /** `PT`: Para cada pasta em `/commands` um novo loop é iniciado para obter os arquivos */
    for (const folder of commandsFolder) {

        /** `PT`: O caminho da pasta `/commands/[folder]` */
        const commandsPath = path.join(foldersPath, folder);
        /** `PT`: String com todos os arquivos TypeScript ou JavaScript da pasta `/commands/[folder]` */
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command: Command = (await import(filePath))?.default;


            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);

                log.successh(`Comando #(${command.data.name})# (#(${folder}/${file})#) cadastrado com sucesso`);





                if (shouldDeploy) {
                    commandsToDeploy.push(command.data.toJSON());
                    log.info(`Comando #(${command.data.name})# (#(${folder}/${file})#) cadastrado para deploy`);
                }
            } else {
                log.warn(`O comando em (#(${folder}/${file})#) não possui as propriedades necessárias "#(data)#" e "#(execute)#".`);
            }
        }
    }

    log.successh(`#(${client.commands.size})# comandos cadastrados com sucesso`);

    shouldDeploy && deployCommands(commandsToDeploy);
}

export async function adminCommandHandler(client: LocalClient) {
    /** `PT`: O caminho da pasta `/admin-commands` */
    const commandsPath = path.join(__dirname, 'admin-commands');
    /** `PT`: String com todos os arquivos TypeScript ou JavaScript da pasta `/admin-commands` */
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));


    for (const file of commandFiles) {

        const filePath = path.join(commandsPath, file);
        const command: AdminCommand = (await import(filePath))?.default;


        if ('data' in command && 'execute' in command) {
            client.adminCommands.set(command.data.name, command);

            log.successh(`Comando de admin #(${command.data.name})# (#(${file})#) cadastrado com sucesso`);
        } else {
            log.warn(`O comando de admin em #(${(file)})# não possui as propriedades necessárias "#(data)#" e "#(execute)#".`);
        }
    }

    log.successh(`#(${client.adminCommands.size})# comandos de admin cadastrados com sucesso`);
}

export async function deployCommands(commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]) {
    const rest = new REST().setToken(process.env.TOKEN!);


    // and deploy your commands!
    try {
        log.loading(`Started refreshing #(${commands.length})# application (/) commands.`);

        // The put method is used to fully refresh all commands with the current set
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands },
        ) as Command[];

        log.success(`Successfully reloaded #(${data.length})# application (/) commands.`,
            `\n${commands.map((command, index) => `#g(${index + 1}º)# ${command.name}`).join('#g(, )#')}`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        log.error('Aconteceu um erro enquanto estava sendo feito o deploy dos comandos no discord', error);
    }
}
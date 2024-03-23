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

    const foldersPath = path.join(__dirname, 'commands');
    const commandsFolder = fs.readdirSync(foldersPath);

    for (const folder of commandsFolder) {

        const commandsPath = path.join(foldersPath, folder);
        const commandPath = fs.readdirSync(commandsPath, { withFileTypes: true }).filter((dir) => dir.isDirectory());


        for (const dir of commandPath) {
            const dirPath = path.join(commandsPath, dir.name);
            const indexFile = fs.readdirSync(dirPath).find((file) => file === 'index.js' || file === 'index.ts');
            
            if (indexFile) {
                const filePath = path.join(dirPath, indexFile);

                const command: Command = (await import(filePath))?.default;
    
    
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
    
                    log.successh(`Comando #(${command.data.name})# (#(${folder}/${dir.name}/${indexFile})#) cadastrado com sucesso`);
    
    
    
                    if (shouldDeploy) {
                        commandsToDeploy.push(command.data.toJSON());
                        log.info(`Comando #(${command.data.name})# (#(${folder}/${dir.name}/${indexFile})#) cadastrado para deploy`);
                    }
                } else {
                    log.warn(`O comando em (#(${folder}/${dir.name}/${indexFile})#) não possui as propriedades necessárias "#(data)#" e "#(execute)#".`);
                }
            } else {
                log.warn(`Comando em (#(${folder}/${dir.name}/)#) não possui arquivo #(index)#`);
            }

            
        }
    }

    log.successh(`#(${client.commands.size})# comandos cadastrados com sucesso`);

    shouldDeploy && deployCommands(commandsToDeploy);
}

/** `PT`: Seta em `client.adminCommands` todos os comandos da pasta `/admin-commands` */
export async function adminCommandHandler(client: LocalClient) {
    const commandsPath = path.join(__dirname, 'admin-commands');
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

/** `PT`: Faz deploy dos comandos para a API do discord (para que apareçam na UI do Discord) */
export async function deployCommands(commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]) {
    const rest = new REST().setToken(process.env.TOKEN!);


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
        log.error('Aconteceu um erro enquanto estava sendo feito o deploy dos comandos no discord', error);
    }
}
import { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';

export default new Command(
    new SlashCommandBuilder()
        .setName('bathrooms')
        .setDescription('List all the bathrooms')
        .addStringOption(
            new SlashCommandStringOption()
                .setName('id')
                .setDescription('ID of the bathroom')
                .setRequired(false)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.campus
                .setRequired(false)
        )
        .addStringOption(
            Command.commandOptions.bathroomManagement.institute
                .setRequired(false)
        )
        .addIntegerOption(
            Command.commandOptions.bathroomManagement.floor
                .setRequired(false)
        )
        .addBooleanOption(
            Command.commandOptions.bathroomManagement.haveShower
                .setRequired(false)
        )
        .addUserOption(
            new SlashCommandUserOption()
                .setName('created-by')
                .setDescription('Quem registrou este banheiro?')
                .setRequired(false)
        ) as SlashCommandBuilder,
    async (interaction, client) => {
        const filters = {
            id: interaction.options.get('id')?.value,
            campus: interaction.options.get('campus')?.value,
            institute: interaction.options.get('institute')?.value,
            floor: interaction.options.get('floor')?.value,
            haveShower: interaction.options.get('have-shower')?.value,
            createdBy: interaction.options.get('created-by')?.value,
        };

        const bathrooms = client.database!.bathroom.filter((bathroom) => {
            return (filters.id ? bathroom.id === filters.id : true) &&
                (filters.campus ? bathroom.campus === filters.campus : true) &&
                (filters.institute ? bathroom.institute === filters.institute : true) &&
                (filters.floor ? bathroom.floor === filters.floor : true) &&
                (filters.haveShower ? bathroom.haveShower === filters.haveShower : true) &&
                (filters.createdBy ? bathroom.createdBy === filters.createdBy : true);
        });

        if (!bathrooms.size) return interaction.reply('No bathroom found');

        interaction.reply({
            embeds: [new EmbedBuilder({
                fields: await Promise.all(bathrooms.map(async (bathroom) => ({
                    name: `${bathroom.campus} - ${bathroom.institute} - ${bathroom.floor === 0 ?
                        'Térreo' :
                        bathroom.floor < 0 ?
                            `${Math.abs(bathroom.floor)}º piso subsolo.` :
                            `${bathroom.floor}º andar`
                    }`,
                    value: `\`\`\`\nID: ${bathroom.id}\n\nTem chuveiro? ${bathroom.haveShower ? 'Sim' : 'Não'}${bathroom.localization ? `\nOnde fica? ${bathroom.localization}` : ''}\n\nCriado por ${(await client.users.fetch(bathroom.createdBy)).tag} em ${Intl.DateTimeFormat('pt-br', { dateStyle: 'full' }).format(bathroom.createdAt)}\n\`\`\``
                })))
            })]
        });
    }
);
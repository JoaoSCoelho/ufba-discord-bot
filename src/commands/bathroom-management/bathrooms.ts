import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';
import { CampusNames, GenderNames } from '../../classes/database/Bathroom';

const data = new SlashCommandBuilder()
    .setName('bathrooms')
    .setDescription('List all the bathrooms')
    .addStringOption(
        Command.commandOptions.bathroomManagement.id()
            .setRequired(false)
    )
    .addStringOption(
        Command.commandOptions.bathroomManagement.campus()
            .setRequired(false)
    )
    .addStringOption(
        Command.commandOptions.bathroomManagement.institute()
            .setRequired(false)
    )
    .addIntegerOption(
        Command.commandOptions.bathroomManagement.floor()
            .setRequired(false)
    )
    .addBooleanOption(
        Command.commandOptions.bathroomManagement.haveShower()
            .setRequired(false)
    )
    .addBooleanOption(
        Command.commandOptions.bathroomManagement.hasHandDryer()
            .setRequired(false)
    )
    .addStringOption(
        Command.commandOptions.bathroomManagement.gender()
            .setRequired(false)
    )
    .addIntegerOption(
        Command.commandOptions.bathroomManagement.cabins()
            .setRequired(false)
    )
    .addIntegerOption(
        Command.commandOptions.bathroomManagement.urinals()
            .setRequired(false)
    )
    .addUserOption(
        new SlashCommandUserOption()
            .setName('created-by')
            .setDescription('Quem registrou este banheiro?')
            .setRequired(false)
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName('have-image')
            .setDescription('Apenas com imagem')
            .setRequired(false)
    ) as SlashCommandBuilder;

export default new Command(
    data,
    async (interaction, client) => {
        const filters = {
            id: interaction.options.get('id')?.value,
            campus: interaction.options.get('campus')?.value,
            institute: interaction.options.get('institute')?.value,
            floor: interaction.options.get('floor')?.value,
            haveShower: interaction.options.get('have-shower')?.value,
            hasHandDryer: interaction.options.get('has-hand-dryer')?.value,
            gender: interaction.options.get('gender')?.value,
            cabins: interaction.options.get('cabins')?.value,
            urinals: interaction.options.get('urinals')?.value,
            createdBy: interaction.options.get('created-by')?.value,
            haveImage: interaction.options.get('have-image')?.value ? true : false,
        };

        const bathrooms = client.database!.bathroom.filter((bathroom) => {
            return (filters.id ? bathroom.id === filters.id : true) &&
                (filters.campus ? bathroom.campus === filters.campus : true) &&
                (filters.institute ? bathroom.institute === filters.institute : true) &&
                (filters.floor ? bathroom.floor === filters.floor : true) &&
                (filters.haveShower ? bathroom.haveShower === filters.haveShower : true) &&
                (filters.hasHandDryer ? bathroom.hasHandDryer === filters.hasHandDryer : true) &&
                (filters.gender ? bathroom.gender === filters.gender : true) &&
                (filters.cabins ? bathroom.cabins === filters.cabins : true) &&
                (filters.urinals ? bathroom.urinals === filters.urinals : true) &&
                (filters.createdBy ? bathroom.createdBy === filters.createdBy : true) &&
                (filters.haveImage ? bathroom.imagesUrls.length > 0 : true);
        });

        if (!bathrooms.size) return interaction.reply('No bathroom found');

        // calculates the quantity of pages (each page have 10 bathrooms)
        const qtdPages = Math.ceil(bathrooms.size / 10);
        let currentPage = 0;

        // Creates a embed for each bathroom in database
        const allEmbeds = await Promise.all(bathrooms.map(async (bathroom) => {
            const embedAuthor = await client.users.fetch(bathroom.createdBy);
            const bathroomFloorFormatted = bathroom.floor === 0 ?
                'Térreo' :
                bathroom.floor < 0 ?
                    `${Math.abs(bathroom.floor)}º piso subsolo.` :
                    `${bathroom.floor}º andar`;
            const embedFields = [];


            if (bathroom.localization)
                embedFields.push({
                    name: '🗺️ Onde fica?',
                    value: bathroom.localization
                });
            if (bathroom.imagesUrls.length > 1)
                embedFields.push({
                    name: '📸 Imagens',
                    value: bathroom.imagesUrls.reduce( // Put all images urls until 1024 characters, the ramaining will be substituted by a emoji
                        (prev, curr) => prev.length + curr.length > 1024 - (bathroom.imagesUrls.length * 4) ? `${prev} 🖼️` : `${prev} ${curr}`,
                        ''
                    ),
                });

            return new EmbedBuilder({
                title: [
                    bathroom.gender &&
                    (bathroom.gender === 'UNISSEX' ?
                        '🚻' :
                        bathroom.gender === 'MASCULINO' ?
                            '🚹' :
                            '🚺'),

                    CampusNames[bathroom.campus],

                    '-',

                    bathroom.institute,

                    '-',

                    bathroomFloorFormatted
                ].filter((t) => typeof t === 'string').join(' '),
                description: [
                    `🆔 **\`${bathroom.id}\`**`,

                    bathroom.gender &&
                    (bathroom.gender === 'UNISSEX' ?
                        `🚾 **${GenderNames[bathroom.gender]}**` :
                        bathroom.gender === 'FEMININO' ?
                            `♀️ **${GenderNames[bathroom.gender]}**` :
                            `♂️ **${GenderNames[bathroom.gender]}**`),

                    `🚿 Chuveiro? **${bathroom.haveShower ? 'Sim' : 'Não'}**`,

                    typeof bathroom.hasHandDryer === 'boolean' ?
                        `🖐️ Secador de mãos? **${bathroom.hasHandDryer ? 'Sim' : 'Não'}**` :
                        undefined,

                    typeof bathroom.cabins === 'number' ?
                        `🚽 Quantidade de cabines: **${bathroom.cabins}**` :
                        undefined,

                    (typeof bathroom.urinals === 'number' && bathroom.gender !== 'FEMININO') ?
                        `🔫 Quantidade de mictórios: **${bathroom.urinals}**` :
                        undefined,

                    `📌 Campus: **${CampusNames[bathroom.campus]}**`,

                    `🏛️ Instituto: **${bathroom.institute}**`,

                    `🛗 Andar/Piso: **${bathroomFloorFormatted}**`
                ].filter((t) => typeof t === 'string').join('\n'),
                fields: embedFields,
                author: {
                    name: embedAuthor.displayName,
                    icon_url: embedAuthor.avatarURL({ size: 64 }),
                },
                timestamp: bathroom.createdAt,
                footer: {
                    text: `Ultima atualização em ${Intl.DateTimeFormat('pt-br', { dateStyle: 'long' }).format(bathroom.updatedAt)}`
                },
                color: ['MASCULINO', 'FEMININO'].includes(bathroom.gender) ?
                    bathroom.gender === 'MASCULINO' ?
                        Colors.Blue :
                        Colors.DarkVividPink :
                    Colors.DarkGrey,
                image: bathroom.mainImageUrl && { url: bathroom.mainImageUrl }
            });
        }));


        // Inputs on "paginatedEmbeds" constant all embeds divided in arrays: [[10_embeds], [10_embeds], ..., [remaining_embeds]]
        const paginatedEmbeds = [];
        for (let i = 0; i < qtdPages; i++) {
            paginatedEmbeds.push(allEmbeds.slice(0 + (i * 10), 10 + (i * 10)));
        }

        // Creates a new ButtonComponent, default disabled to show the current page that the user is navigating
        const createCurrentPageButton = () => new ButtonBuilder()
            .setCustomId('current-page')
            .setDisabled()
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`${currentPage + 1} / ${paginatedEmbeds.length}`);

        const createBackward10Button = () => new ButtonBuilder()
            .setCustomId('backward-10')
            .setLabel('10 <<')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage + 1 <= 2 ? true : false);

        const createBackwardButton = () => new ButtonBuilder()
            .setCustomId('backward')
            .setLabel('1 <<')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage + 1 === 1 ? true : false);

        const createForwardButton = () => new ButtonBuilder()
            .setCustomId('forward')
            .setLabel('>> 1')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage + 1 === paginatedEmbeds.length);

        const createForward10Button = () => new ButtonBuilder()
            .setCustomId('forward-10')
            .setLabel('>> 10')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage + 1 >= paginatedEmbeds.length - 1);

        const rowComponents = () => new ActionRowBuilder<ButtonBuilder>()
            .setComponents(
                createBackward10Button(),
                createBackwardButton(),
                createCurrentPageButton(),
                createForwardButton(),
                createForward10Button()
            );


        const response = await interaction.reply({
            content: `${bathrooms.size} resultados encontrados`,
            embeds:
                paginatedEmbeds[currentPage],
            components: paginatedEmbeds.length > 1 ? [rowComponents()] : undefined
        });


        // Collects the buttons interactions and changes the currentPage

        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60000 * 5, // 5 minutes
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'backward-10') currentPage = Math.max(0, currentPage - 10);
            else if (i.customId === 'backward') currentPage = Math.max(0, currentPage - 1);
            else if (i.customId === 'forward') currentPage = Math.min(paginatedEmbeds.length - 1, currentPage + 1);
            else if (i.customId === 'forward-10') currentPage = Math.min(paginatedEmbeds.length - 1, currentPage + 10);

            await i.update({
                embeds: paginatedEmbeds[currentPage],
                components: [rowComponents()]
            });
        });
    }
);
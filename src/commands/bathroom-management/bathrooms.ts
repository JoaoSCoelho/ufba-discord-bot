import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';
import { CampusNames } from '../../classes/database/Bathroom';

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
            createdBy: interaction.options.get('created-by')?.value,
            haveImage: interaction.options.get('have-image')?.value ? true : false,
        };

        const bathrooms = client.database!.bathroom.filter((bathroom) => {
            return (filters.id ? bathroom.id === filters.id : true) &&
                (filters.campus ? bathroom.campus === filters.campus : true) &&
                (filters.institute ? bathroom.institute === filters.institute : true) &&
                (filters.floor ? bathroom.floor === filters.floor : true) &&
                (filters.haveShower ? bathroom.haveShower === filters.haveShower : true) &&
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
                    name: 'Onde fica?',
                    value: bathroom.localization
                });
            if (bathroom.imagesUrls.length > 1)
                embedFields.push({
                    name: 'Imagens',
                    value: bathroom.imagesUrls.reduce( // Put all images urls until 1024 characters, the ramaining will be substituted by a emoji
                        (prev, curr) => prev.length + curr.length > 1024 - (bathroom.imagesUrls.length * 4) ? `${prev} 🖼️` : `${prev} ${curr}`,
                        ''
                    ),
                });

            return new EmbedBuilder({
                title: `${bathroom.campus} - ${bathroom.institute} - ${bathroomFloorFormatted}`,
                description: `🆔 **\`${bathroom.id}\`**\n🚿 Chuveiro? **${bathroom.haveShower ? 'Sim' : 'Não'}**\n📌 Campus: **${CampusNames[bathroom.campus]}**\n🏛️ Instituto: **${bathroom.institute}**\n🛗 Andar/Piso: **${bathroomFloorFormatted}**`,
                fields: embedFields,
                author: {
                    name: embedAuthor.displayName,
                    icon_url: embedAuthor.avatarURL({ size: 64 }),
                },
                timestamp: bathroom.createdAt,
                footer: {
                    text: `Ultima atualização em ${Intl.DateTimeFormat('pt-br', { dateStyle: 'long' }).format(bathroom.updatedAt)}`
                },
                color: Colors[Object.keys(Colors)[Math.round(Math.random() * (Object.values(Colors).length))]],
                image: bathroom.mainImageUrl && { url: bathroom.mainImageUrl }
            });
        }));


        // Inputs on "paginatedEmbeds" constant all embeds divided in arrays: [[10_embeds], [10_embeds], ..., [remaining_embeds]]
        const paginatedEmbeds = [];
        for (let i = 0; i < qtdPages; i++) {
            paginatedEmbeds.push(allEmbeds.slice(0 + (i * 10), 10 + (i * 10)));
        }

        // Creates a new ButtonComponent, default disabled to show the current page that the user is navigating
        function createCurrentPageButton() {
            return new ButtonBuilder()
                .setCustomId('current-page')
                .setDisabled()
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`${currentPage + 1} / ${paginatedEmbeds.length}`);
        }


        const rowComponents = new ActionRowBuilder<ButtonBuilder>()
            .setComponents(
                new ButtonBuilder()
                    .setCustomId('backward-10')
                    .setLabel('10 <<')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('backward')
                    .setLabel('1 <<')
                    .setStyle(ButtonStyle.Secondary),
                createCurrentPageButton(),
                new ButtonBuilder()
                    .setCustomId('forward')
                    .setLabel('>> 1')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('forward-10')
                    .setLabel('>> 10')
                    .setStyle(ButtonStyle.Secondary)
            );

            
        const response = await interaction.reply({
            content: `${bathrooms.size} resultados encontrados`,
            embeds:
                paginatedEmbeds[currentPage],
            components: paginatedEmbeds.length > 1 ? [rowComponents] : undefined
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
            
            rowComponents.components.splice(2, 1, createCurrentPageButton());
            await i.update({
                embeds: paginatedEmbeds[currentPage],
                components: [rowComponents]
            });
        });
    }
);
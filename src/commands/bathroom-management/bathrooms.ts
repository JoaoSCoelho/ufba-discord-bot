import { APIEmbedField, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusNames, CampusValues, GenderNames, GenderValues } from '../../classes/database/Bathroom';

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
        const filters = getOptions();
        const bathrooms = client.database!.bathroom.filter((bathroom) => bathroomsFilter(bathroom, filters));

        if (!bathrooms.size) return interaction.reply('No bathroom found');

        // calculates the quantity of pages (each page have 10 bathrooms)
        let currentPage = 0;

        // Creates a embed for each bathroom in database
        const allEmbeds = await Promise.all(bathrooms.map((bathroom) => embedFactory(bathroom)));


        // Inputs on "paginatedEmbeds" constant all embeds divided in arrays: [[10_embeds], [10_embeds], ..., [remaining_embeds]]
        const paginatedEmbeds = paginatedEmbedsFactory(allEmbeds);
        

        const response = await interaction.reply({
            content: `${bathrooms.size} resultados encontrados`,
            embeds: paginatedEmbeds[currentPage],
            components: paginatedEmbeds.length > 1 ? [rowComponentsFactory()] : undefined
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
                components: [rowComponentsFactory()]
            });
        });






        function getOptions() {
            return {
                id: interaction.options.get('id')?.value as string | undefined,
                campus: interaction.options.get('campus')?.value as CampusValues | undefined,
                institute: interaction.options.get('institute')?.value as string | undefined,
                floor: interaction.options.get('floor')?.value as number | undefined,
                haveShower: interaction.options.get('have-shower')?.value as boolean | undefined,
                hasHandDryer: interaction.options.get('has-hand-dryer')?.value as boolean | undefined,
                gender: interaction.options.get('gender')?.value as GenderValues | undefined,
                cabins: interaction.options.get('cabins')?.value as number | undefined,
                urinals: interaction.options.get('urinals')?.value as number | undefined,
                createdBy: interaction.options.get('created-by')?.value as string | undefined,
                haveImage: interaction.options.get('have-image')?.value as boolean | undefined,
            };
        }

        function bathroomsFilter(bathroom: Bathroom, filters: ReturnType<typeof getOptions>) {
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

        }

        async function embedFactory(bathroom: Bathroom) {
            const embedAuthor = await client.users.fetch(bathroom.createdBy);
            const bathroomFloorFormatted = formatFloor();
            const lastUpdateFormatted = Intl.DateTimeFormat('pt-br', { dateStyle: 'long' }).format(bathroom.updatedAt);

            return new EmbedBuilder({
                title: `${CampusNames[bathroom.campus]} - ${bathroom.institute} - ${bathroomFloorFormatted}`,
                description: descriptionFactory(bathroomFloorFormatted),
                fields: fieldsFactory(),
                author: { name: `Criado por **${embedAuthor.displayName}**`, icon_url: embedAuthor.avatarURL({ size: 64 }) },
                timestamp: bathroom.createdAt,
                footer: { text: `Ultima atualização em ${lastUpdateFormatted}` },
                color: colorFactory(),
                image: bathroom.mainImageUrl && { url: bathroom.mainImageUrl }
            });



            function formatFloor() {
                if (bathroom.floor === 0) return 'Térreo';
                else if (bathroom.floor < 0) return `${Math.abs(bathroom.floor)}º piso subsolo.`;
                else return `${bathroom.floor}º andar`;
            }

            function descriptionFactory(bathroomFloorFormatted: string) {
                const id = `🆔 **\`${bathroom.id}\`**`;
                const gender = genderFactory();
                const haveShower = `🚿 Chuveiro? **${bathroom.haveShower ? 'Sim' : 'Não'}**`;
                const hasHandDryer = typeof bathroom.hasHandDryer === 'boolean' ?
                    `🖐️ Secador de mãos? **${bathroom.hasHandDryer ? 'Sim' : 'Não'}**` :
                    undefined;
                const cabins = typeof bathroom.cabins === 'number' ?
                    `🚽 Quantidade de cabines: **${bathroom.cabins}**` :
                    undefined;
                const urinals = (typeof bathroom.urinals === 'number' && bathroom.gender !== 'FEMININO') ?
                    `🔫 Quantidade de mictórios: **${bathroom.urinals}**` :
                    undefined;
                const campus = `📌 Campus: **${CampusNames[bathroom.campus]}**`;
                const institute = `🏛️ Instituto: **${bathroom.institute}**`;
                const floor = `🛗 Andar/Piso: **${bathroomFloorFormatted}**`;


                return [id, gender, haveShower, hasHandDryer, cabins, urinals, campus, institute, floor]
                    .filter((t) => typeof t === 'string').join('\n');



                function genderFactory(): string | undefined {
                    if (bathroom.gender === 'UNISSEX') return `🚾 **${GenderNames[bathroom.gender]}**`;
                    else if (bathroom.gender === 'FEMININO') return `♀️ **${GenderNames[bathroom.gender]}**`;
                    else if (bathroom.gender === 'MASCULINO') return `♂️ **${GenderNames[bathroom.gender]}**`;
                }
            }

            function fieldsFactory() {
                const fields: APIEmbedField[] = [];
                if (bathroom.localization)
                    fields.push({
                        name: '🗺️ Onde fica?',
                        value: bathroom.localization
                    });
                if (bathroom.imagesUrls.length > 1)
                    fields.push({
                        name: '📸 Imagens',
                        value: bathroom.imagesUrls.reduce( // Put all images urls until 1024 characters, the ramaining will be substituted by a emoji
                            (prev, curr) => prev.length + curr.length > 1024 - (bathroom.imagesUrls.length * 4) ? `${prev} 🖼️` : `${prev} ${curr}`,
                            ''
                        ),
                    });

                return fields;
            }

            function colorFactory() {
                if (bathroom.gender === 'MASCULINO') return Colors.Blue;
                else if (bathroom.gender === 'FEMININO') return Colors.LuminousVividPink;
                else return Colors.DarkGrey;
            }
        }

        
        function rowComponentsFactory() {
            
            return new ActionRowBuilder<ButtonBuilder>()
                .setComponents(
                    backward10ButtonFactory(),
                    backwardButtonFactory(),
                    currentPageButtonFactory(),
                    forwardButtonFactory(),
                    forward10ButtonFactory()
                );

            // Creates a new ButtonComponent, default disabled to show the current page that the user is navigating

            function currentPageButtonFactory() {
                return new ButtonBuilder()
                    .setCustomId('current-page')
                    .setDisabled()
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel(`${currentPage + 1} / ${paginatedEmbeds.length}`);
            }
        
            function backward10ButtonFactory() {
                return new ButtonBuilder()
                    .setCustomId('backward-10')
                    .setLabel('10 <<')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage + 1 <= 2 ? true : false);
            }
        
            function backwardButtonFactory() {
                return new ButtonBuilder()
                    .setCustomId('backward')
                    .setLabel('1 <<')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage + 1 === 1 ? true : false);
            }
        
            function forwardButtonFactory() {
                return new ButtonBuilder()
                    .setCustomId('forward')
                    .setLabel('>> 1')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage + 1 === paginatedEmbeds.length);
            }
        
            function forward10ButtonFactory() {
                return new ButtonBuilder()
                    .setCustomId('forward-10')
                    .setLabel('>> 10')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage + 1 >= paginatedEmbeds.length - 1);
            }
        }

        function paginatedEmbedsFactory(embeds: EmbedBuilder[]) {
            const paginated: EmbedBuilder[][] = [];
            const qtdPages = Math.ceil(bathrooms.size / 10);

            for (let i = 0; i < qtdPages; i++) {
                paginated.push(embeds.slice(0 + (i * 10), 10 + (i * 10)));
            }
            return paginated;
        }
    }
);
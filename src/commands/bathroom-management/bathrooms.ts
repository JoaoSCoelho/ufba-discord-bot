import { APIEmbedField, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, Colors, EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import Command from '../../classes/Command';
import Bathroom, { CampusNames, CampusValues, GenderNames, GenderValues } from '../../classes/database/Bathroom';
import BathroomAvaliation from '../../classes/database/BathroomAvaliation';

const data = new SlashCommandBuilder()
    .setName('bathrooms')
    .setDescription('List all the bathrooms')
    .addStringOption(
        Command.commandOptions.bathroomManagement.id()
            .setDescription('Encontre um banheiro específico pelo seu número de identificação')
    )
    .addStringOption(
        Command.commandOptions.bathroomManagement.campus()
            .setDescription('Filtre apenas banheiros de um campus específico.')
    )
    .addStringOption(
        Command.commandOptions.bathroomManagement.institute()
            .setDescription('Filtre apenas banheiros de um instituto específico.')
    )
    .addIntegerOption(
        Command.commandOptions.bathroomManagement.floor()
            .setDescription('Encontre apenas banheiros que estejam em um andar específico.')
    )
    .addBooleanOption(
        Command.commandOptions.bathroomManagement.haveShower()
            .setDescription('Encontre apenas banheiros que tenham chuveiro.')
    )
    .addBooleanOption(
        Command.commandOptions.bathroomManagement.hasHandDryer()
            .setDescription('Encontre apenas banheiros que tenham secador para mãos.')
    )
    .addStringOption(
        Command.commandOptions.bathroomManagement.gender()
            .setDescription('Encontre apenas banheiros de um gênero específico.')
    )
    .addIntegerOption(
        Command.commandOptions.bathroomManagement.cabins()
            .setDescription('Encontre banheiros que possuam uma quantidade específica de cabines.')

    )
    .addIntegerOption(
        Command.commandOptions.bathroomManagement.urinals()
            .setDescription('Encontre banheiros que possuam uma quantidade específica de mictórios.')
    )
    .addUserOption(
        new SlashCommandUserOption()
            .setName('criador')
            .setDescription('Encontra banheiros criados por um usuário específico.')
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
            .setName('tem-imagem')
            .setDescription('Filtra apenas banheiros que tenham imagens.')
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
                institute: interaction.options.get('instituto')?.value as string | undefined,
                floor: interaction.options.get('andar')?.value as number | undefined,
                haveShower: interaction.options.get('tem-chuveiro')?.value as boolean | undefined,
                hasHandDryer: interaction.options.get('tem-secador-de-maos')?.value as boolean | undefined,
                gender: interaction.options.get('genero')?.value as GenderValues | undefined,
                cabins: interaction.options.get('cabines')?.value as number | undefined,
                urinals: interaction.options.get('mictorios')?.value as number | undefined,
                createdBy: interaction.options.get('criador')?.value as string | undefined,
                haveImage: interaction.options.get('tem-imagem')?.value as boolean | undefined,
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
            const avaliations = client.database!.bathroomAvaliation.filter((bathroomAvaliation) => bathroomAvaliation.bathroomId === bathroom.id);

            const embedAuthor = await client.users.fetch(bathroom.createdBy);
            const bathroomFloorFormatted = formatFloor();
            const lastUpdateFormatted = Intl.DateTimeFormat('pt-br', { dateStyle: 'long' }).format(bathroom.updatedAt);


            return new EmbedBuilder({
                title: `${CampusNames[bathroom.campus]} - ${bathroom.institute} - ${bathroomFloorFormatted}`,
                description: descriptionFactory(bathroomFloorFormatted, avaliations),
                fields: fieldsFactory(),
                author: { name: `Criado por ${embedAuthor.displayName}`, icon_url: embedAuthor.avatarURL({ size: 64 }) },
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

            function descriptionFactory(bathroomFloorFormatted: string, avaliations: Collection<string, BathroomAvaliation>) {
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
                const avarageRating = avarageRatingFactory();
                const avarageCleaningRating = avarageCleaningRatingFactory();
                const usuallyHasPaperTowel = usuallyHasPaperTowelFactory();
                const usuallyHasToiletPaper = usuallyHasToiletPaperFactory();
                const usuallyHasSoap = usuallyHasSoapFactory();
                const usuallySmellsGood = usuallySmellsGoodFactory();

                return [
                    id, gender, haveShower, hasHandDryer, cabins, urinals, campus, institute, floor, avarageRating, avarageCleaningRating,
                    usuallyHasPaperTowel, usuallyHasToiletPaper, usuallyHasSoap, usuallySmellsGood
                ]
                    .filter((t) => typeof t === 'string').join('\n');



                function genderFactory(): string | undefined {
                    if (bathroom.gender === 'UNISSEX') return `🚾 **${GenderNames[bathroom.gender]}**`;
                    else if (bathroom.gender === 'FEMININO') return `♀️ **${GenderNames[bathroom.gender]}**`;
                    else if (bathroom.gender === 'MASCULINO') return `♂️ **${GenderNames[bathroom.gender]}**`;
                }

                function avarageRatingFactory() {
                    if (!avaliations.size) return undefined;

                    const avarageRating = avaliations.reduce((prev, curr) => prev + curr.grade, 0) / avaliations.size;
                    return `✨ Avaliação média: ${starsFactory(avarageRating)}`;
                }

                function avarageCleaningRatingFactory() {
                    if (!avaliations.size) return undefined;

                    const avarageCleaningRating = avaliations.reduce((prev, curr) => prev + curr.cleaningGrade, 0) / avaliations.size;
                    return `🧹 Avaliação média da limpeza: ${starsFactory(avarageCleaningRating)}`;
                }

                function usuallyHasPaperTowelFactory() {
                    if (!avaliations.size) return undefined;

                    const hasPaperTowelPercent = Number(((avaliations.filter(avaliation => avaliation.hasPaperTowel).size / avaliations.size) * 100).toFixed(1));
                    const dontHasPaperTowelPercent = 100 - hasPaperTowelPercent;
                    return `🧻 Costuma ter papel toalha? **👍 ${hasPaperTowelPercent}%** | **👎 ${dontHasPaperTowelPercent}%**`;
                }

                function usuallyHasToiletPaperFactory() {
                    if (!avaliations.size) return undefined;

                    const avaliationsWithHasToiletPaper = avaliations.filter(avaliation => typeof avaliation.hasToiletPaper === 'boolean');

                    if (!avaliationsWithHasToiletPaper.size) return undefined;

                    const hasToiletPaperPercent = Number(((avaliationsWithHasToiletPaper.filter(avaliation => avaliation.hasToiletPaper).size / avaliationsWithHasToiletPaper.size) * 100).toFixed(1));
                    const dontHasToiletPaperPercent = 100 - hasToiletPaperPercent;
                    return `🧻 Costuma ter papel higiênico? **👍 ${hasToiletPaperPercent}%** | **👎 ${dontHasToiletPaperPercent}%**`;
                }

                function usuallyHasSoapFactory() {
                    if (!avaliations.size) return undefined;

                    const hasSoapPercent = Number(((avaliations.filter(avaliation => avaliation.hasSoap).size / avaliations.size) * 100).toFixed(1));
                    const dontHasSoapPercent = 100 - hasSoapPercent;
                    return `🧼 Costuma ter sabonete? **👍 ${hasSoapPercent}%** | **👎 ${dontHasSoapPercent}%**`;
                }

                function usuallySmellsGoodFactory() {
                    if (!avaliations.size) return undefined;

                    const smellsGoodPercent = Number(((avaliations.filter(avaliation => avaliation.smellsGood).size / avaliations.size) * 100).toFixed(1));
                    const dontSmellsGoodPercent = 100 - smellsGoodPercent;
                    return `🧴 Costuma cheirar bem? **👍 ${smellsGoodPercent}%** | **👎 ${dontSmellsGoodPercent}%**`;
                }

                function starsFactory(grade: number) {
                    const fullStars = parseInt((grade / 2).toString());
                    const halfStar = grade % 2 !== 0 ? 1 : 0;
                    const emptyStars = 5 - fullStars - halfStar;

                    const fullStarEmoji = '<:' + client.emojis.cache.find((e) => e.name === 'fullstar').identifier + '>';
                    const halfStarEmoji = '<:' + client.emojis.cache.find((e) => e.name === 'halfstar').identifier + '>';
                    const emptyStarEmoji = '<:' + client.emojis.cache.find((e) => e.name === 'emptystar').identifier + '>';

                    return fullStarEmoji.repeat(fullStars) + halfStarEmoji.repeat(halfStar) + emptyStarEmoji.repeat(emptyStars);
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
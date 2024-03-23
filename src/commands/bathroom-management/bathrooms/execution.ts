import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, EmbedBuilder, SelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import CommandExecution from '../../../classes/CommandExecution';
import getBathroomAvarageRating from '../../../shared/getBathroomAvarageRating';
import Bathroom, { CampusValues, GenderValues } from '../../../classes/database/Bathroom';
import BathroomAvaliation from '../../../classes/database/BathroomAvaliation';
import bathroomEmbedFactory from '../../../shared/bathroomEmbedFactory';

type BathroomWithAvaliations = Bathroom & {
    avaliations: Collection<string, BathroomAvaliation>
    avarageGrade: number,
    avarageCleaningGrade: number,
}

enum OrderByTypes {
    createdAt='date',
    updatedAt='date',
    campus='string',
    institute='string',
    avarageGrade='number',
    avarageCleaningGrade='number',
}

export default class BathroomsExecution extends CommandExecution {
    currentPage = 0;
    embedsPerPage = 1;
    orderBy: 'createdAt' | 'updatedAt' | 'campus' | 'institute' | 'avarageGrade' | 'avarageCleaningGrade' = 'createdAt';
    order: 'ascending' | 'descending' = 'descending';
    bathrooms?: Collection<string, BathroomWithAvaliations>;
    paginatedEmbeds?: EmbedBuilder[][];

    run = async () => {
        
        const filters = this.getOptions();

        this.bathrooms = this.client.database!.bathroom
            .filter(bathroomsFilter)
            .mapValues((bathroom) => {
                const avaliations = this.client.database!.bathroomAvaliation.filter((bathroomAvaliation) => bathroomAvaliation.bathroomId === bathroom.id);
                return ({
                    ...bathroom, 
                    avaliations,
                    avarageGrade: getBathroomAvarageRating(avaliations, 'grade'),
                    avarageCleaningGrade: getBathroomAvarageRating(avaliations, 'cleaningGrade')
                }) as BathroomWithAvaliations;
            })
            .sort(this.bathroomsSorter.bind(this));

        if (!this.bathrooms.size) return this.interaction.reply('Nenhum banheiro encontrado.');

        // calculates the quantity of pages 
        

        // Inputs on "paginatedEmbeds" constant all embeds divided in arrays: [[10_embeds], [10_embeds], ..., [remaining_embeds]]
        this.paginatedEmbeds = await this.paginatedEmbedsFactory();


        const response = await this.interaction.reply(this.messagePayloadFactory());


        // Collects the buttons interactions and changes the currentPage

        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === this.interaction.user.id,
            time: 60000 * 5, // 5 minutes
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'backward-10') this.currentPage = Math.max(0, this.currentPage - 10);
            else if (i.customId === 'backward') this.currentPage = Math.max(0, this.currentPage - 1);
            else if (i.customId === 'forward') this.currentPage = Math.min(this.paginatedEmbeds!.length - 1, this.currentPage + 1);
            else if (i.customId === 'forward-10') this.currentPage = Math.min(this.paginatedEmbeds!.length - 1, this.currentPage + 10);
            else if (i.customId === 'items-per-page') {
                if (!i.isStringSelectMenu()) return;
                this.embedsPerPage = Number(i.values[0]);
                this.paginatedEmbeds = await this.paginatedEmbedsFactory();
            } 
            else if (i.customId === 'order-by' || i.customId === 'order') {
                if (!i.isStringSelectMenu()) return;
                
                if (i.customId === 'order-by') this.orderBy = i.values[0] as typeof this.orderBy;
                else if (i.customId === 'order') this.order = i.values[0] as typeof this.order;
                
                this.bathrooms = this.bathrooms!.sort(this.bathroomsSorter.bind(this));
                this.paginatedEmbeds = await this.paginatedEmbedsFactory();
            }

            await i.update(this.messagePayloadFactory());
        });






        function bathroomsFilter(bathroom: Bathroom) {
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


    
    };

    async paginatedEmbedsFactory() {
        const paginated: EmbedBuilder[][] = [];
        const qtdPages = Math.ceil(this.bathrooms!.size / this.embedsPerPage);
        // Creates a embed for each bathroom in database
        const allEmbeds = await Promise.all(this.bathrooms!.map((bathroom) => bathroomEmbedFactory(this.client, bathroom)));

        for (let i = 0; i < qtdPages; i++) {
            paginated.push(allEmbeds.slice(0 + (i * this.embedsPerPage), this.embedsPerPage + (i * this.embedsPerPage)));
        }
        return paginated;
    }

    getOptions() {
        return {
            id: this.interaction.options.get('id')?.value as string | undefined,
            campus: this.interaction.options.get('campus')?.value as CampusValues | undefined,
            institute: this.interaction.options.get('instituto')?.value as string | undefined,
            floor: this.interaction.options.get('andar')?.value as number | undefined,
            haveShower: this.interaction.options.get('tem-chuveiro')?.value as boolean | undefined,
            hasHandDryer: this.interaction.options.get('tem-secador-de-maos')?.value as boolean | undefined,
            gender: this.interaction.options.get('genero')?.value as GenderValues | undefined,
            cabins: this.interaction.options.get('cabines')?.value as number | undefined,
            urinals: this.interaction.options.get('mictorios')?.value as number | undefined,
            createdBy: this.interaction.options.get('criador')?.value as string | undefined,
            haveImage: this.interaction.options.get('tem-imagem')?.value as boolean | undefined,
        };
    }

    bathroomsSorter(first: BathroomWithAvaliations, second: BathroomWithAvaliations)  {
        if (OrderByTypes[this.orderBy] === 'date') {
            const firstTimestamp = new Date(first[this.orderBy]).getTime();
            const secondTimestamp = new Date(second[this.orderBy]).getTime();

            if (this.order === 'ascending') return firstTimestamp - secondTimestamp;
            else if (this.order === 'descending') return secondTimestamp - firstTimestamp;
        }
        else if (OrderByTypes[this.orderBy] === 'string') {
            const firstString = (first[this.orderBy] as string).toUpperCase(); // ignore upper and lowercase
            const secondString = (second[this.orderBy] as string).toUpperCase(); // ignore upper and lowercase

            if (firstString < secondString && this.order === 'ascending') return -1;
            else if (firstString < secondString && this.order === 'descending') return 1;
            else if (firstString > secondString && this.order === 'ascending') return 1;
            else if (firstString > secondString && this.order === 'descending') return -1;
            else return 0;
        } 
        else if (OrderByTypes[this.orderBy] === 'number') {
            if (this.order === 'ascending') return (first[this.orderBy] as number) - (second[this.orderBy] as number);
            else if (this.order === 'descending') return (second[this.orderBy] as number) - (first[this.orderBy] as number);
        }
        return 0;
    }

    rowPaginationComponentsFactory() {

        return new ActionRowBuilder<ButtonBuilder>()
            .setComponents(
                backward10ButtonFactory.bind(this)(),
                backwardButtonFactory.bind(this)(),
                currentPageButtonFactory.bind(this)(),
                forwardButtonFactory.bind(this)(),
                forward10ButtonFactory.bind(this)()
            );

        // Creates a new ButtonComponent, default disabled to show the current page that the user is navigating

        function currentPageButtonFactory(this: BathroomsExecution) {
            return new ButtonBuilder()
                .setCustomId('current-page')
                .setDisabled()
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`${this.currentPage + 1} / ${this.paginatedEmbeds!.length}`);
        }

        function backward10ButtonFactory(this: BathroomsExecution) {
            return new ButtonBuilder()
                .setCustomId('backward-10')
                .setLabel('10 <<')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this.currentPage + 1 <= 2 ? true : false);
        }

        function backwardButtonFactory(this: BathroomsExecution) {
            return new ButtonBuilder()
                .setCustomId('backward')
                .setLabel('1 <<')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this.currentPage + 1 === 1 ? true : false);
        }

        function forwardButtonFactory(this: BathroomsExecution) {
            return new ButtonBuilder()
                .setCustomId('forward')
                .setLabel('>> 1')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this.currentPage + 1 === this.paginatedEmbeds!.length);
        }

        function forward10ButtonFactory(this: BathroomsExecution) {
            return new ButtonBuilder()
                .setCustomId('forward-10')
                .setLabel('>> 10')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this.currentPage + 1 >= this.paginatedEmbeds!.length - 1);
        }
    }

    rowItemsPerPageComponentsFactory() {

        return new ActionRowBuilder<SelectMenuBuilder>()
            .setComponents(itemsPerPageSelectMenuFactory.bind(this)());


        function itemsPerPageSelectMenuFactory(this: BathroomsExecution) {
            return new StringSelectMenuBuilder()
                .setCustomId('items-per-page')
                .setPlaceholder('Banheiros por página')
                .setOptions(
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Exibe um único banheiro por página')
                        .setLabel('1')
                        .setValue('1')
                        .setDefault(this.embedsPerPage === 1),
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Exibe 5 banheiros por página')
                        .setLabel('5')
                        .setValue('5')
                        .setDefault(this.embedsPerPage === 5),
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Exibe 10 banheiros por página')
                        .setLabel('10')
                        .setValue('10')
                        .setDefault(this.embedsPerPage === 10)
                );
        }
    }

    rowOrderByComponentsFactory() {
        return new ActionRowBuilder<SelectMenuBuilder>()
            .setComponents(
                orderBySelectMenuFactory.bind(this)()
            );

        function orderBySelectMenuFactory(this: BathroomsExecution) {
            return new StringSelectMenuBuilder()
                .setCustomId('order-by')
                .setPlaceholder('Ordenar por...')
                .setOptions(
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Ordenar por data de criação')
                        .setEmoji('🗓️')
                        .setLabel('Data de criação')
                        .setValue('createdAt')
                        .setDefault(this.orderBy === 'createdAt'),
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Ordenar por última atualização')
                        .setEmoji('🗓️')
                        .setLabel('Data de atualização')
                        .setValue('updatedAt')
                        .setDefault(this.orderBy === 'updatedAt'),
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Ordenar por campus')
                        .setEmoji('🅰️')
                        .setLabel('Campus')
                        .setValue('campus')
                        .setDefault(this.orderBy === 'campus'),
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Ordenar por instituto')
                        .setEmoji('🅰️')
                        .setLabel('Instituto')
                        .setValue('institute')
                        .setDefault(this.orderBy === 'institute'),
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Ordenar por avaliação média')
                        .setEmoji('⭐')
                        .setLabel('Avaliação')
                        .setValue('avarageGrade')
                        .setDefault(this.orderBy === 'avarageGrade'),
                    new StringSelectMenuOptionBuilder()
                        .setDescription('Ordenar por avaliação média da limpeza')
                        .setEmoji('⭐')
                        .setLabel('Avaliação da limpeza')
                        .setValue('avarageCleaningGrade')
                        .setDefault(this.orderBy === 'avarageCleaningGrade')
                );
        }
    }

    rowOrderComponentsFactory() {
        return new ActionRowBuilder<SelectMenuBuilder>()
            .setComponents(
                orderSelectMenuFactory.bind(this)()
            );

        function orderSelectMenuFactory(this: BathroomsExecution) {
            const ascendingOption = new StringSelectMenuOptionBuilder()
                .setEmoji('⬆️')
                .setDefault(this.order === 'ascending')
                .setValue('ascending');
            const descendingOption = new StringSelectMenuOptionBuilder()
                .setEmoji('⬇️')
                .setDefault(this.order === 'descending')
                .setValue('descending');

            if (OrderByTypes[this.orderBy] === 'date') {
                ascendingOption.setLabel('Mais antigos');
                ascendingOption.setDescription('Ordenar por mais antigos primeiro');
                descendingOption.setLabel('Mais recentes');
                descendingOption.setDescription('Ordenar por mais recentes primeiro');
            } else if (OrderByTypes[this.orderBy] === 'string') {
                ascendingOption.setLabel('A-Z');
                ascendingOption.setDescription('Ordenar em ordem alfabética');
                descendingOption.setLabel('Z-A');
                descendingOption.setDescription('Ordenar em ordem alfabética invertida');
            } else if (OrderByTypes[this.orderBy] === 'number') {
                ascendingOption.setLabel('Crescente');
                ascendingOption.setDescription('Ordenar do menor para o maior');
                descendingOption.setLabel('Decrescente');
                descendingOption.setDescription('Ordenar do maior para o menor');
            }

            return new StringSelectMenuBuilder()
                .setCustomId('order')
                .setPlaceholder('Ordenar')
                .setOptions(ascendingOption, descendingOption);
        }
    }

    messagePayloadFactory() {
        return {
            content: `**${this.bathrooms!.size}** resultados encontrados`,
            embeds: this.paginatedEmbeds![this.currentPage],
            components: [this.rowPaginationComponentsFactory(), this.rowItemsPerPageComponentsFactory(), this.rowOrderByComponentsFactory(), this.rowOrderComponentsFactory()]
        };
    }
}
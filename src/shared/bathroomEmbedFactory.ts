// File Version: 0.0.1

import { APIEmbedField, Collection, Colors, EmbedBuilder } from 'discord.js';
import LocalClient from '../classes/LocalClient';
import Bathroom, { CampusNames, GenderNames } from '../classes/database/Bathroom';
import BathroomAvaliation from '../classes/database/BathroomAvaliation';
import getBathroomAvarageRating from './getBathroomAvarageRating';

/** 
 * `PT`: Retorna uma EmbedBuilder com informações do banheiro fornecido
 * @param bathroom `PT`: Tem todos os dados de um Bathroom. Se um parâmetro for "null", o campo é preenchido com underlines
 * @param bathroom[].avaliations `PT`: Conjunto de avaliações que cada banheiro possui.
 */
export default async function bathroomEmbedFactory(
    client: LocalClient,
    bathroom: {
        [T in keyof Bathroom]: Bathroom[T] | null
    } & {
        /** `PT`:Conjunto de avaliações que cada banheiro possui. */
        avaliations: Collection<string, BathroomAvaliation>
    }) {
    const avaliations = bathroom.avaliations;

    const embedAuthor = bathroom.createdBy ? await client.users.fetch(bathroom.createdBy) : null;
    const bathroomFloorFormatted = bathroom.floor !== null ? formatFloor() : '\\_\\_\\_\\_\\_\\_\\_\\_';
    const lastUpdateFormatted = bathroom.updatedAt && Intl.DateTimeFormat('pt-br', { dateStyle: 'long' }).format(bathroom.updatedAt);
    const campusName = bathroom.campus ? CampusNames[bathroom.campus] : '\\_\\_\\_\\_\\_\\_\\_\\_';
    const instituteName = bathroom.institute ?? '\\_\\_\\_\\_\\_\\_\\_\\_';

    return new EmbedBuilder({
        title: `${campusName} - ${instituteName} - ${bathroomFloorFormatted}`,
        description: descriptionFactory(),
        fields: fieldsFactory(),
        author: {
            name: `Criado por ${embedAuthor ? embedAuthor.displayName : '_______'}`,
            icon_url: embedAuthor?.avatarURL({ size: 64 }) ?? undefined
        },
        timestamp: bathroom.createdAt?.toString(),
        footer: bathroom.updatedAt ? { text: `Ultima atualização em ${lastUpdateFormatted}` } : undefined,
        color: colorFactory(),
        image: bathroom.mainImageUrl ? { url: bathroom.mainImageUrl } : undefined
    });



    /** `PT`: Retorna uma string bem formatada dependendo do valor do campo `floor` do `bathroom` */
    function formatFloor() {
        if (bathroom.floor === 0) return 'Térreo';
        else if (bathroom.floor! < 0) return `${Math.abs(bathroom.floor!)}º piso subsolo.`;
        else return `${bathroom.floor}º andar`;
    }

    function descriptionFactory() {
        const id = `🆔 **\`${bathroom.id ?? '_____________'}\`**`;
        const gender = bathroom.gender !== null ? genderFactory() : '🚾 **\\_\\_\\_\\_\\_\\_\\_\\_**';
        const haveShower = `🚿 Chuveiro? **${bathroom.haveShower !== null ? bathroom.haveShower ? 'Sim' : 'Não' : '\\_\\_\\_'}**`;
        const hasHandDryer = bathroom.hasHandDryer !== undefined ?
            `🖐️ Secador de mãos? **${bathroom.hasHandDryer !== null ? bathroom.hasHandDryer ? 'Sim' : 'Não' : '\\_\\_\\_'}**` :
            undefined;
        const cabins = bathroom.cabins !== undefined ?
            `🚽 Quantidade de cabines: **${bathroom.cabins !== null ? bathroom.cabins : '\\_\\_'}**` :
            undefined;
        const urinals = bathroom.urinals !== undefined ?
            `🔫 Quantidade de mictórios: **${bathroom.urinals !== null ? bathroom.urinals : '\\_\\_'}**` :
            undefined;
        const campus = `📌 Campus: **${campusName}**`;
        const institute = `🏛️ Instituto: **${instituteName}**`;
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

            const avarageRating = getBathroomAvarageRating(avaliations, 'grade');
            return `✨ Avaliação média: ${starsFactory(avarageRating)}`;
        }

        function avarageCleaningRatingFactory() {
            if (!avaliations.size) return undefined;

            const avarageCleaningRating = getBathroomAvarageRating(avaliations, 'cleaningGrade');
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

            const fullStarEmoji = '<:' + client.emojis.cache.find((e) => e.name === 'fullstar')?.identifier + '>';
            const halfStarEmoji = '<:' + client.emojis.cache.find((e) => e.name === 'halfstar')?.identifier + '>';
            const emptyStarEmoji = '<:' + client.emojis.cache.find((e) => e.name === 'emptystar')?.identifier + '>';

            return fullStarEmoji.repeat(fullStars) + halfStarEmoji.repeat(halfStar) + emptyStarEmoji.repeat(emptyStars);
        }
    }

    function fieldsFactory() {
        const fields: APIEmbedField[] = [];
        if (bathroom.localization !== undefined)
            fields.push({
                name: '🗺️ Onde fica?',
                value: bathroom.localization !== null ?
                    bathroom.localization :
                    '\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\n\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\n\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_'
            });
        if (bathroom.imagesUrls === null || bathroom.imagesUrls.length > 0)
            fields.push({
                name: '📸 Imagens',
                value: bathroom.imagesUrls !== null ?
                    bathroom.imagesUrls.reduce( // Put all images urls until 1024 characters, the ramaining will be substituted by a emoji
                        (prev, curr) => prev.length + curr.length > 1024 - (bathroom.imagesUrls!.length * 4) ? `${prev} 🖼️` : `${prev} ${curr}`,
                        ''
                    ) :
                    '`_________.jpg` `______________.png` `______.jpeg` 🖼️ 🖼️',
            });

        return fields;
    }

    function colorFactory() {
        if (bathroom.gender === 'MASCULINO') return Colors.Blue;
        else if (bathroom.gender === 'FEMININO') return Colors.LuminousVividPink;
        else return Colors.DarkGrey;
    }
}
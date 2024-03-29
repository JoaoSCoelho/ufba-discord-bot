import { Collection } from 'discord.js';
import BathroomAvaliation from '../classes/database/BathroomAvaliation';

/** `PT`: Faz a média entre as notas de "property" de um conjunto de avaliações */
export default function getBathroomAvarageRating(avaliations: Collection<string, BathroomAvaliation>, property: 'grade' | 'cleaningGrade') {
    if (!avaliations.size) return -1;
    return avaliations.reduce((prev, curr) => prev + curr[property], 0) / avaliations.size;
}
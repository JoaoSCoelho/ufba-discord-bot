import SlashCommand from '../../../classes/Command';
import avaliateBathroomData from './data';
import AvaliateBathroomExecution from './execution';

export default new SlashCommand(
    avaliateBathroomData,
    AvaliateBathroomExecution
);
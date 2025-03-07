import SlashCommand from '../../../classes/SlashCommand';
import avaliateBathroomData from './data';
import AvaliateBathroomExecution from './execution';

export default new SlashCommand(
    avaliateBathroomData,
    AvaliateBathroomExecution
);
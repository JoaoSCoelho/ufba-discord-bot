import SlashCommand from '../../../classes/SlashCommand';
import deleteBathroomData from './data';
import DeleteBathroomExecution from './execution';

export default new SlashCommand(
    deleteBathroomData,
    DeleteBathroomExecution
);
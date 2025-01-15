import SlashCommand from '../../../classes/Command';
import deleteBathroomData from './data';
import DeleteBathroomExecution from './execution';

export default new SlashCommand(
    deleteBathroomData,
    DeleteBathroomExecution
);
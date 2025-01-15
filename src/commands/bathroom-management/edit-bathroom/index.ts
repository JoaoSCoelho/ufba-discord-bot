import SlashCommand from '../../../classes/Command';
import editBathroomData from './data';
import EditBathroomExecution from './execution';

export default new SlashCommand(
    editBathroomData,
    EditBathroomExecution
);
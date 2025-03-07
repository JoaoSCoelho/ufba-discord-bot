import SlashCommand from '../../../classes/SlashCommand';
import editBathroomData from './data';
import EditBathroomExecution from './execution';

export default new SlashCommand(
    editBathroomData,
    EditBathroomExecution
);
import Command from '../../../classes/Command';
import editBathroomData from './data';
import EditBathroomExecution from './execution';

export default new Command(
    editBathroomData,
    EditBathroomExecution
);
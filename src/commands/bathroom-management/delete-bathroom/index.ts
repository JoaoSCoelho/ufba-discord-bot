import Command from '../../../classes/Command';
import deleteBathroomData from './data';
import DeleteBathroomExecution from './execution';

export default new Command(
    deleteBathroomData,
    DeleteBathroomExecution
);
import Command from '../../../classes/Command';
import avaliateBathroomData from './data';
import AvaliateBathroomExecution from './execution';

export default new Command(
    avaliateBathroomData,
    AvaliateBathroomExecution
);
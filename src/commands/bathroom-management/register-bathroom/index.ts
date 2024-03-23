import Command from '../../../classes/Command';
import registerBathroomData from './data';
import RegisterBathroomExecution from './execution';

// [TODO]: DOCUMENTAR ESSE COMANDO



export default new Command(
    registerBathroomData,
    RegisterBathroomExecution
);
import SlashCommand from '../../../classes/Command';
import registerBathroomData from './data';
import RegisterBathroomExecution from './execution';

// [TODO]: DOCUMENTAR ESSE COMANDO



export default new SlashCommand(
    registerBathroomData,
    RegisterBathroomExecution
);
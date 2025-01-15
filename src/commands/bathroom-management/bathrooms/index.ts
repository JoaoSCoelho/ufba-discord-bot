import SlashCommand from '../../../classes/Command';
import bathroomsData from './data';
import BathroomsExecution from './execution';


export default new SlashCommand(
    bathroomsData,
    BathroomsExecution
);
import SlashCommand from '../../../classes/SlashCommand';
import bathroomsData from './data';
import BathroomsExecution from './execution';


export default new SlashCommand(
    bathroomsData,
    BathroomsExecution
);
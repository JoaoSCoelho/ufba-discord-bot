import Command from '../../../classes/Command';
import bathroomsData from './data';
import BathroomsExecution from './execution';


export default new Command(
    bathroomsData,
    BathroomsExecution
);
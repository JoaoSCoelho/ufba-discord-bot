import SlashCommand from '../../../classes/SlashCommand';
import addBathroomImagesData from './data';
import AddBathroomImagesExecution from './execution';



export default new SlashCommand(
    addBathroomImagesData,
    AddBathroomImagesExecution
);


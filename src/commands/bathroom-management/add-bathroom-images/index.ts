import Command from '../../../classes/Command';
import addBathroomImagesData from './data';
import AddBathroomImagesExecution from './execution';



export default new Command(
    addBathroomImagesData,
    AddBathroomImagesExecution
);


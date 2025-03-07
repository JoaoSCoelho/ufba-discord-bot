import SlashCommand from '../../../classes/SlashCommand';
import removeBathroomImagesData, { documentation as removeBathroomImagesDocumentation } from './data';
import RemoveBathroomImagesExecution from './execution';

export default new SlashCommand(
    removeBathroomImagesData,
    RemoveBathroomImagesExecution,
    removeBathroomImagesDocumentation
);
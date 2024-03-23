import CommandExecution from '../../../classes/CommandExecution';
import Bathroom from '../../../classes/database/Bathroom';

export default class AddBathroomImagesExecution extends CommandExecution {
    run = async () => {
        
        // Getting options
        const bathroomId = this.interaction.options.get('id')!.value as string;

        const imagesUrls = this.getImagesOptions();

        const oldBathroom = this.client.database!.bathroom.get(bathroomId);

        // Making verifications
        if (!oldBathroom) return this.interaction.reply('Não existe um banheiro com este ID!');
        if (oldBathroom.imagesUrls.length >= Bathroom.imagesUrls.max) return this.interaction.reply('Não há mais espaço para imagens neste banheiro!');

        if (oldBathroom.imagesUrls.length + imagesUrls.length > Bathroom.imagesUrls.max) {
            this.interaction.channel!.send(`${oldBathroom.imagesUrls.length + imagesUrls.length - Bathroom.imagesUrls.max} imagens não serão adicionadas pois ultrapassam o limite de ${Bathroom.imagesUrls.max} imagens por banheiro.`);
            imagesUrls.splice(-(oldBathroom.imagesUrls.length + imagesUrls.length - Bathroom.imagesUrls.max));
        }

        // Editting the bathroom

        // New instance of Bathroom with the new images
        const newBathroom = new Bathroom({
            ...oldBathroom,
            updatedAt: new Date(),
            imagesUrls: oldBathroom.imagesUrls.concat(imagesUrls)
        });

        const awaitingMessage = await this.interaction.reply('Adicionando...');

        await this.client.database!.bathroom.edit(newBathroom);

        await awaitingMessage.edit('Imagens adicionadas.');

    };

    getImagesOptions() {
        const urls: string[] = [];

        for (let i = 0; i < Bathroom.imagesUrls.max; i++) {
            const imageUrl = this.interaction.options.get(`imagem-${i + 1}`)?.attachment!.url;
            imageUrl && urls.push(imageUrl);
        }

        return urls;
    }
}
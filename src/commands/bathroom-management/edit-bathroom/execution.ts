import CommandExecution from '../../../classes/CommandExecution';
import Bathroom, { CampusValues, GenderValues } from '../../../classes/database/Bathroom';


export default class EditBathroomExecution extends CommandExecution {
    run = async () => {
        // Getting options
        const options = {
            id: this.interaction.options.get('id')!.value as string,
            campus: this.interaction.options.get('campus')?.value as CampusValues | undefined,
            institute: this.interaction.options.get('instituto')?.value as string | undefined,
            floor: this.interaction.options.get('andar')?.value as number | undefined,
            haveShower: this.interaction.options.get('tem-chuveiro')?.value as boolean | undefined,
            hasHandDryer: this.interaction.options.get('tem-secador-de-maos')?.value as boolean | undefined,
            gender: this.interaction.options.get('genero')?.value as GenderValues | undefined,
            cabins: this.interaction.options.get('cabines')?.value as number | undefined,
            urinals: this.interaction.options.get('mictorios')?.value as number | undefined,
            localization: this.interaction.options.get('localizacao')?.value as string | undefined,
            mainImageUrl: this.interaction.options.get('url-da-imagem-principal')?.value as string | undefined,
        };

        const oldBathroom = this.client.database!.bathroom.get(options.id);

        // Making some verifications

        if (!oldBathroom) return this.interaction.reply('Não existe banheiro com este ID!');

        if (this.interaction.user.id !== oldBathroom.createdBy && !this.client.admins.includes(this.interaction.user.id))
            return this.interaction.reply('Você não tem autorização para editar este banheiro!');

        if (options.mainImageUrl && !oldBathroom.imagesUrls.includes(options.mainImageUrl))
            return this.interaction.reply('url-da-imagem-principal não é uma imagem do banheiro. Use /adicionar-imagens-a-um-banheiro antes disso!');


        // Edit the bathroom

        const newBathroom = new Bathroom({
            ...oldBathroom,
            updatedAt: new Date(),
            campus: options.campus ?? oldBathroom.campus,
            institute: options.institute ?? oldBathroom.institute,
            floor: options.floor ?? oldBathroom.floor,
            haveShower: options.haveShower ?? oldBathroom.haveShower,
            hasHandDryer: options.hasHandDryer ?? oldBathroom.hasHandDryer,
            gender: options.gender ?? oldBathroom.gender,
            cabins: options.cabins ?? oldBathroom.cabins,
            urinals: options.urinals ?? oldBathroom.urinals,
            localization: options.localization ?? oldBathroom.localization,
            mainImageUrl: options.mainImageUrl ?? oldBathroom.mainImageUrl,
        });

        const response = await this.interaction.reply('Editando...');

        await this.client.database!.bathroom.edit(newBathroom);

        response.edit('Banheiro editado.');
    };
}
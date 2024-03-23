import CommandExecution from '../../../classes/CommandExecution';
import BathroomAvaliation from '../../../classes/database/BathroomAvaliation';

export default class AvaliateBathroomExecution extends CommandExecution {
    run = async () => {
        
        const options = this.getOptions();

        if (this.client.database!.bathroomAvaliation.find(
            (bathroomAvaliation) => bathroomAvaliation.bathroomId === options.bathroomId && bathroomAvaliation.createdBy === this.interaction.user.id
        )) return this.interaction.reply('Você já avaliou este banheiro!');

        if (!this.client.database!.bathroom.has(options.bathroomId)) return this.interaction.reply('Não existe um banheiro com este ID!');

        const bathroomAvaliation = new BathroomAvaliation({
            id: Date.now().toString(),
            createdBy: this.interaction.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            bathroomId: options.bathroomId,
            grade: options.grade,
            cleaningGrade: options.cleaningGrade,
            hasPaperTowel: options.hasPaperTowel,
            hasToiletPaper: options.hasToiletPaper,
            hasSoap: options.hasSoap,
            smellsGood: options.smellsGood,
            observations: options.observations,
            imagesUrls: options.imageUrl ? [options.imageUrl] : undefined
        });

        await this.client.database!.bathroomAvaliation.new(bathroomAvaliation);
        
        await this.interaction.reply('Banheiro avaliado!');
    
    };



    getOptions() {
        return {
            bathroomId: this.interaction.options.get('id-do-banheiro')!.value as string,
            grade: this.interaction.options.get('nota')!.value as number,
            cleaningGrade: this.interaction.options.get('nota-da-limpeza')!.value as number,
            hasPaperTowel: this.interaction.options.get('tem-papel-toalha')!.value as boolean,
            hasToiletPaper: this.interaction.options.get('tem-papel-higienico')?.value as boolean | undefined,
            hasSoap: this.interaction.options.get('tem-sabonete')!.value as boolean,
            smellsGood: this.interaction.options.get('cheira-bem')!.value as boolean,
            observations: this.interaction.options.get('comentarios')?.value as string | undefined,
            imageUrl: this.interaction.options.get('imagem')?.attachment!.url as string | undefined,
        };
    }
}
import CommandExecution from '../../../classes/CommandExecution';

export default class DeleteBathroomExecution extends CommandExecution {
    run = async () => {
        
        const bathroomId = this.interaction.options.get('id')!.value as string;

        const bathroom = this.client.database!.bathroom.get(bathroomId);

        // Making verifications

        if (!bathroom) return this.interaction.reply('Não existe banheiro com este ID!');
        if (bathroom.createdBy !== this.interaction.user.id && !this.client.admins.includes(this.interaction.user.id))
            return this.interaction.reply('Você não tem autorização para deletar este banheiro!');




        const bathroomAvaliations = this.client.database!.bathroomAvaliation
            .filter((bathroomAvaliation) => bathroomAvaliation.bathroomId === bathroom.id);

        // Removing avaliations
        await Promise.all(bathroomAvaliations.map(async (bathroomAvaliation) => {
            await this.client.database!.bathroomAvaliation.remove(bathroomAvaliation.id);
        }))
            .catch((err) => {
                console.error(`The user ${this.interaction.user.tag} tried to use /deletar-banheiro command and a error ocurred when the avaliation were being deleted:`, err);
            });


        // Removing the bathroom
        await this.client.database!.bathroom.remove(bathroomId);

        await this.interaction.reply('Banheiro deletado.');
    
    };
}
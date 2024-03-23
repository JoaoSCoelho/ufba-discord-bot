import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import Bathroom from '../../../classes/database/Bathroom';

export default new SlashCommandBuilder()
    .setName('remover-imagens-de-um-banheiro')
    .setDescription('Remove as imagens que você quiser de um banheiro que você criou.')
    .addStringOption(
        new SlashCommandStringOption()
            .setName(Bathroom.id.name)
            .setDescription('ID do banheiro. (Obtenha em /banheiros)')
            .setRequired(true)
    ) as SlashCommandBuilder;

export const documentation = {
    howToUse: 'Use /remover-imagens-de-um-banheiro e passe o ID do banheiro na opção "id", em seguida uma lista com todas as imagens cadastradas para este banheiro será exibida, selecione aquelas que deseja deletar no botão "⬜ Selecionar", (o botão mudará para "✅ Desselecionar"). Depois de selecionadas todas as imagens que deseja deletar, confirme a deleção clicando em "Deletar as selecionadas" na última mensagem da lista.',
    optionsTutorial: {
        id: 'Passe o ID do banheiro ao qual deseja deletar imagens. Esse ID pode ser obtido pelo uso do comando "/banheiros".'
    }
};
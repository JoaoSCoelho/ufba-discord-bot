import { ActionRowBuilder, SelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { StringSelectMenuData } from '../../Form.types';

export default class StringSelectMenuActionRowBuilder<Returns extends string> extends ActionRowBuilder<SelectMenuBuilder> {
    constructor(select: StringSelectMenuData<Returns>) {
        super();

        const selectMenu = new StringSelectMenuBuilder()
            .setMaxValues(select.maxValues)
            .setCustomId(select.customId);

        if (select.placeholder)
            selectMenu.setPlaceholder(select.placeholder);


        /** Add options to select menu */
        selectMenu.addOptions(
            ...select.options.map(
                (data) => new StringSelectMenuOptionBuilder(data)
            )
        );

        this.setComponents(selectMenu);
    }
}
import Entity from './Entity';

export type CampusValues = 'ONDINA' | 'FEDERACAO' | 'CANELA' | 'SAO_LAZARO' | 'VITORIA' | 'CAMACARI';

export enum CampusNames {
    ONDINA='Ondina',
    FEDERACAO='Federação',
    CANELA='Canela',
    SAO_LAZARO='São Lázaro',
    VITORIA='Vitória da Conquista',
    CAMACARI='Camaçari'
}

export default class Bathroom extends Entity {
    public readonly campus: CampusValues;
    public readonly institute: string;
    public readonly floor: number;
    public readonly haveShower: boolean;
    public readonly createdBy: string;
    public localization?: string;
    public mainImageUrl?: string;
    public imagesUrls: string[];
    // grade: number;
    // cleaningGrade: number;
    // cleaningNote?: string;
    // hasPaper: boolean;
    constructor(
        data: {
            id: string,
            createdAt: Date,
            updatedAt: Date,
            campus: CampusValues,
            institute: string,
            floor: number,
            haveShower: boolean,
            createdBy: string,
            localization?: string,
            mainImageUrl?: string,
            imagesUrls?: string[],
        }
    ) {
        super(data.id, data.createdAt, data.updatedAt);
        // [update] create object values for each prop
        this.campus = data.campus;
        this.institute = data.institute;
        this.floor = data.floor;
        this.haveShower = data.haveShower;
        this.createdBy = data.createdBy;
        this.localization = data.localization;
        this.mainImageUrl = data.mainImageUrl;
        this.imagesUrls = data.imagesUrls || [];
    }

    static imagesLimit = 25;
}
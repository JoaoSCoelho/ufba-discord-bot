import Entity from './Entity';

export type CampusValues = 'ONDINA' | 'FEDERACAO' | 'CANELA' | 'SAO_LAZARO' | 'VITORIA' | 'CAMACARI';
export type GenderValues = 'MASCULINO' | 'FEMININO' | 'UNISSEX';

export enum CampusNames {
    ONDINA='Ondina',
    FEDERACAO='Federação',
    CANELA='Canela',
    SAO_LAZARO='São Lázaro',
    VITORIA='Vitória da Conquista',
    CAMACARI='Camaçari'
}
export enum GenderNames {
    MASCULINO='Masculino',
    FEMININO='Feminino',
    UNISSEX='Unissex'
}

export default class Bathroom extends Entity {
    public readonly campus: CampusValues;
    public readonly institute: string;
    public readonly floor: number;
    public readonly haveShower: boolean;
    public readonly createdBy: string;
    public readonly hasHandDryer?: boolean;
    public readonly gender?: GenderValues; 
    public readonly cabins?: number;
    public readonly urinals?: number;
    public readonly localization?: string;
    public readonly mainImageUrl?: string;
    public readonly imagesUrls: string[];
    
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
            hasHandDryer?: boolean;
            gender?: GenderValues;
            cabins?: number;
            urinals?: number;
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
        this.hasHandDryer = data.hasHandDryer;
        this.gender = data.gender;
        this.cabins = data.cabins;
        this.urinals = data.urinals;
        this.localization = data.localization;
        this.mainImageUrl = data.mainImageUrl;
        this.imagesUrls = data.imagesUrls || [];
    }

    static imagesLimit = 20;
}
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

    static id = {
        name: 'id'
    } as const;

    static campus = {
        name: 'campus',
        commandOptionsChoices: [
            { name: CampusNames.CANELA, value: 'CANELA' },
            { name: CampusNames.ONDINA, value: 'ONDINA' },
            { name: CampusNames.SAO_LAZARO, value: 'SAO_LAZARO' },
            { name: CampusNames.FEDERACAO, value: 'FEDERACAO' },
            { name: CampusNames.VITORIA, value: 'VITORIA' },
            { name: CampusNames.CAMACARI, value: 'CAMACARI' },
        ],
    } as const;

    static institute = {
        name: 'instituto',
        minLength: 3,
        maxLength: 50,
    } as const;

    static floor = {
        name: 'andar',
        max: 163,
        min: -2400
    } as const;

    static haveShower = {
        name: 'tem-chuveiro'
    } as const;

    static hasHandDryer = {
        name: 'tem-secador-de-maos'
    } as const;

    static gender = {
        name: 'genero',
        commandOptionsChoices: [
            { name: GenderNames.MASCULINO, value: 'MASCULINO' },
            { name: GenderNames.FEMININO, value: 'FEMININO' },
            { name: GenderNames.UNISSEX, value: 'UNISSEX' },
        ]
    } as const;

    static cabins = {
        name: 'cabines',
        min: 0,
        max: 1000
    } as const;

    static urinals = {
        name: 'mictorios',
        min: 0,
        max: 1000,
    } as const;

    static localization = {
        name: 'localizacao',
        minLength: 10,
        maxLength: 512
    } as const;

    static mainImageUrl = {
        name: 'imagem-principal',
    } as const;

    static imagesUrls = {
        max: 20
    } as const;
}
import Entity from './Entity';

export default class BathroomAvaliation extends Entity {
    public readonly bathroomId: string;
    public readonly grade: number;
    public readonly cleaningGrade: number;
    public readonly hasPaperTowel: boolean;
    public readonly hasToiletPaper?: boolean;
    public readonly hasSoap: boolean;
    public readonly smellsGood: boolean;
    public readonly observations?: string;
    public readonly imagesUrls?: string[];
    public readonly createdBy: string;

    constructor(
        data: {
            id: string,
            createdAt: Date,
            updatedAt: Date,
            bathroomId: string,
            grade: number,
            cleaningGrade: number,
            hasPaperTowel: boolean,
            hasToiletPaper?: boolean,
            hasSoap: boolean,
            smellsGood: boolean,
            observations?: string,
            imagesUrls?: string[],
            createdBy: string,
        }
    ) {
        super(data.id, data.createdAt, data.updatedAt);
        // [update] create object values for each prop
        this.bathroomId = data.bathroomId;
        this.grade = data.grade;
        this.cleaningGrade = data.cleaningGrade;
        this.hasPaperTowel = data.hasPaperTowel;
        this.hasToiletPaper = data.hasToiletPaper;
        this.hasSoap = data.hasSoap;
        this.smellsGood = data.smellsGood;
        this.observations = data.observations;
        this.imagesUrls = data.imagesUrls;
        this.createdBy = data.createdBy;
    }

    static bathroomId = {
        name: 'id-do-banheiro',
    } as const;

    static grade = {
        name: 'nota',
        min: 0,
        max: 10
    } as const;

    static cleaningGrade = {
        name: 'nota-da-limpeza',
        min: 0,
        max: 10
    } as const;

    static hasPaperTowel = {
        name: 'tem-papel-toalha'
    } as const;

    static hasToiletPaper = {
        name: 'tem-papel-higienico'
    } as const;

    static hasSoap = {
        name: 'tem-sabonete'
    } as const;

    static smellsGood = {
        name: 'cheira-bem'
    } as const;

    static observations = {
        name: 'comentarios',
        minLength: 10,
        maxLength: 500
    } as const;
}
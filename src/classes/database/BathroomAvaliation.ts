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
    public readonly imageUrl?: string;
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
            imageUrl?: string,
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
        this.imageUrl = data.imageUrl;
        this.createdBy = data.createdBy;
    }
}
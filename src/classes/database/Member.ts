import Entity from './Entity';

export default class Member extends Entity {
    public readonly discordId: string;
    public readonly discordGuildId: string;
    public readonly score: number;
    public readonly badges: string[];

    constructor(
        data: {
            id: string,
            createdAt: Date,
            updatedAt: Date,
            discordId: string,
            discordGuildId: string,
            score?: number,
            badges?: string[],
        }
    ) {
        super(data.id, data.createdAt, data.updatedAt);

        this.discordId = data.discordId;
        this.discordGuildId = data.discordGuildId;
        this.score = data.score ?? 0;
        this.badges = data.badges ?? [];
    }
}
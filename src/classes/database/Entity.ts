export default class Entity {
    protected constructor(
        public readonly id: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ) {}
}


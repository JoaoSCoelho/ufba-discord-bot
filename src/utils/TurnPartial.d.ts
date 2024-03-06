export type TurnPartial<Obj, KeyToTurnPartial extends string | number | symbol> = 
    Omit<Obj, KeyToTurnPartial> & { [Key in KeyToTurnPartial]?: Obj[Key] }
export class PrincipalVariation {
  constructor(
    public readonly moves: string[], // list of coordinate strings e.g. ["e2e4", "e7e5"]
    public readonly sanMoves: string[] = []
  ) {}

  public getUciMoves(): string[] {
    return this.moves;
  }

  public getSanMoves(): string[] {
    return this.sanMoves;
  }

  public format(limit: number = 3): string {
    if (this.sanMoves && this.sanMoves.length > 0) {
      return this.sanMoves.slice(0, limit).join(' ');
    }
    return this.moves.slice(0, limit).join(' ');
  }
}

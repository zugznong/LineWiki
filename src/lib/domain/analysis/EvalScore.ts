export type ScoreType = 'cp' | 'mate';

export class EvalScore {
  constructor(
    public readonly type: ScoreType,
    public readonly value: number
  ) {}

  public format(): string {
    if (this.type === 'mate') {
      const prefix = this.value > 0 ? 'M' : '-M';
      return `${prefix}${Math.abs(this.value)}`;
    }
    const score = this.value / 100;
    if (score === 0) return '0.0';
    const sign = score > 0 ? '+' : '';
    
    // To match cleaner output formats like +0.4 instead of +0.40,
    // we format to a clean floating representation.
    let finalScore = score.toFixed(2);
    if (finalScore.endsWith('.00')) {
      finalScore = finalScore.slice(0, -3);
    } else if (finalScore.endsWith('0')) {
      finalScore = finalScore.slice(0, -1);
    }
    if (finalScore === '0' || finalScore === '-0') return '0.0';
    return `${sign}${finalScore}`;
  }

  public isMate(): boolean {
    return this.type === 'mate';
  }

  public isCp(): boolean {
    return this.type === 'cp';
  }
}

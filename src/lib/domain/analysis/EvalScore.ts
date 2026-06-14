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
    if (Math.abs(score) < 0.005) return '0.00';
    const sign = score > 0 ? '+' : '';
    
    const finalScore = score.toFixed(2);
    if (finalScore === '-0.00' || finalScore === '0.00') return '0.00';
    return `${sign}${finalScore}`;
  }

  public isMate(): boolean {
    return this.type === 'mate';
  }

  public isCp(): boolean {
    return this.type === 'cp';
  }
}

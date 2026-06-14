import { EvalScore } from './EvalScore';
import { PrincipalVariation } from './PrincipalVariation';

export type AnalysisState = 'idle' | 'analyzing' | 'completed' | 'stopped';

export class LocalAnalysisResult {
  constructor(
    public readonly fen: string,
    public readonly depth: number,
    public readonly score: EvalScore,
    public readonly pv: PrincipalVariation,
    public readonly bestMoveUci: string,
    public readonly bestMoveSan: string | null = null,
    public readonly state: AnalysisState = 'completed',
    public readonly nps: number = 0,
    public readonly timeMs: number = 0,
    public readonly multiPvIndex: number = 1,
    public readonly selDepth: number = 0,
    public readonly nodes: number = 0,
    public readonly hashFull: number = 0,
    public readonly rootMoveUci: string = '',
    public readonly analysisId?: string
  ) {}
}

import type { EvalScore, ScoreType } from './EvalScore';

export type AnalysisStatus = 'idle' | 'preparing' | 'analyzing' | 'completed' | 'stopped' | 'failed';
export type Depth = number;
export type ScoreTypeUnion = ScoreType;

export interface EngineMessage {
  raw: string;
  type: 'info' | 'option' | 'uciok' | 'readyok' | 'bestmove';
  parsed?: any;
}

export interface EngineMoveEvaluation {
  moveSan: string;
  moveUci: string;
  score: EvalScore | null;
  depth: Depth;
}

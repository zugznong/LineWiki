import type { Result } from '../utils/result';
import type { EngineMoveEvaluation } from '../domain/analysis/AnalysisTypes';

export interface StoredEvaluationPort {
  loadEvaluations(fen: string, moveUcis: string[]): Promise<Result<Record<string, EngineMoveEvaluation>, Error>>;
}

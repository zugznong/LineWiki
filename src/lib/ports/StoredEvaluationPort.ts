import type { Result } from '../utils/result';
import type { EngineMoveEvaluation } from '../domain/analysis/AnalysisTypes';

export interface StoredEvaluationBatch {
  fen: string;
  engineVersion?: string;
  queriedAt: string;
  evaluations: Record<string, EngineMoveEvaluation>;
  trustMetadata: Record<string, {
    isTrusted: boolean;
    reason?: string;
  }>;
}

export interface StoredEvaluationPort {
  loadEvaluations(fen: string, moveUcis: string[], signal?: AbortSignal): Promise<Result<StoredEvaluationBatch, Error>>;
}

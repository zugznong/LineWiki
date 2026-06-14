import type { StoredEvaluationPort, StoredEvaluationBatch } from '../../../ports/StoredEvaluationPort';
import { type Result, success, failure } from '../../../utils/result';
import { EvalScore } from '../../../domain/analysis/EvalScore';
import type { EngineMoveEvaluation } from '../../../domain/analysis/AnalysisTypes';

export class BrowserMockStoredEvaluationAdapter implements StoredEvaluationPort {
  async loadEvaluations(fen: string, _moveUcis: string[], signal?: AbortSignal): Promise<Result<StoredEvaluationBatch, Error>> {
    if (signal?.aborted) {
      return failure(new DOMException('Aborted', 'AbortError'));
    }
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.__MOCK_DB_ERROR__) {
        return failure(new Error(win.__MOCK_DB_ERROR__));
      }
      if (win.__MOCK_DB_EVALS__) {
        const restoredEvals: Record<string, EngineMoveEvaluation> = {};
        for (const [key, value] of Object.entries(win.__MOCK_DB_EVALS__)) {
          const rawEval = value as any;
          let evalScore: EvalScore | null = null;
          if (rawEval.score) {
            evalScore = new EvalScore(rawEval.score.type, rawEval.score.value);
          }
          restoredEvals[key] = {
            ...rawEval,
            score: evalScore
          };
        }
        return success({
          fen,
          queriedAt: new Date().toISOString(),
          evaluations: restoredEvals,
          trustMetadata: win.__MOCK_DB_TRUST__ || {}
        });
      }
    }

    return success({
      fen,
      queriedAt: new Date().toISOString(),
      evaluations: {},
      trustMetadata: {}
    });
  }
}

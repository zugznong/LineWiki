import type { StoredEvaluationPort, StoredEvaluationBatch } from '../../src/lib/ports/StoredEvaluationPort';
import { type Result, success, failure } from '../../src/lib/utils/result';

export class FakeStoredEvaluationAdapter implements StoredEvaluationPort {
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
        return success({
          fen,
          queriedAt: new Date().toISOString(),
          evaluations: win.__MOCK_DB_EVALS__,
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

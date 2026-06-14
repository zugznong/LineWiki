import type { StoredEvaluationPort, StoredEvaluationBatch } from '../../../ports/StoredEvaluationPort';
import { type Result, success, failure } from '../../../utils/result';

export class DisabledStoredEvaluationAdapter implements StoredEvaluationPort {
  async loadEvaluations(fen: string, _moveUcis: string[], signal?: AbortSignal): Promise<Result<StoredEvaluationBatch, Error>> {
    if (signal?.aborted) {
      return failure(new DOMException('Aborted', 'AbortError'));
    }
    return success({
      fen,
      queriedAt: new Date().toISOString(),
      evaluations: {},
      trustMetadata: {}
    });
  }
}

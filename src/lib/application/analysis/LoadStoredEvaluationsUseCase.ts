import type { StoredEvaluationPort, StoredEvaluationBatch } from '../../ports/StoredEvaluationPort';
import type { Result } from '../../utils/result';

export class LoadStoredEvaluationsUseCase {
  constructor(private readonly storedEvaluationPort: StoredEvaluationPort) {}

  public async execute(fen: string, moveUcis: string[], signal?: AbortSignal): Promise<Result<StoredEvaluationBatch, Error>> {
    return this.storedEvaluationPort.loadEvaluations(fen, moveUcis, signal);
  }
}

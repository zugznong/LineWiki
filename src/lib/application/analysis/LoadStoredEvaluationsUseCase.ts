import type { StoredEvaluationPort } from '../../ports/StoredEvaluationPort';
import type { EngineMoveEvaluation } from '../../domain/analysis/AnalysisTypes';
import type { Result } from '../../utils/result';

export class LoadStoredEvaluationsUseCase {
  constructor(private readonly storedEvaluationPort: StoredEvaluationPort) {}

  public async execute(fen: string, moveUcis: string[]): Promise<Result<Record<string, EngineMoveEvaluation>, Error>> {
    return this.storedEvaluationPort.loadEvaluations(fen, moveUcis);
  }
}

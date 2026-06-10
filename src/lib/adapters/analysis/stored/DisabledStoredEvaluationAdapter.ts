import type { StoredEvaluationPort } from '../../../ports/StoredEvaluationPort';
import type { EngineMoveEvaluation } from '../../../domain/analysis/AnalysisTypes';
import { type Result, success } from '../../../utils/result';

export class DisabledStoredEvaluationAdapter implements StoredEvaluationPort {
  async loadEvaluations(fen: string, moveUcis: string[]): Promise<Result<Record<string, EngineMoveEvaluation>, Error>> {
    return success({});
  }
}

import { StoredEvaluationPolicy } from '../../domain/analysis/StoredEvaluationPolicy';
import type { EngineMoveEvaluation } from '../../domain/analysis/AnalysisTypes';

export class SelectLocalAnalysisTargetsUseCase {
  constructor(private readonly policy: StoredEvaluationPolicy) {}

  public execute(
    candidateMoves: any[],
    storedEvaluations: Record<string, EngineMoveEvaluation>
  ): any[] {
    return candidateMoves.filter(move => {
      const stored = storedEvaluations[move.uci];
      // DB 평가가 없거나 신뢰 조건을 충족하지 못한 후보수만 로컬 실시간 분석 대상이 됨
      return !this.policy.isTrusted(stored);
    });
  }
}

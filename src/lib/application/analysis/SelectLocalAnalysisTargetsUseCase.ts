import type { EngineMoveEvaluation } from '../../domain/analysis/AnalysisTypes';

export interface SelectTargetsOptions {
  minDepth?: number;
  maxAgeMs?: number;
}

export class SelectLocalAnalysisTargetsUseCase {
  public execute(
    candidateMoves: any[],
    storedEvaluations: Record<string, EngineMoveEvaluation>,
    options: SelectTargetsOptions = {}
  ): any[] {
    const minDepth = options.minDepth ?? 18; // 기본적으로 depth 18 미만인 DB 평가는 로컬로 보강 분석합니다
    const maxAgeMs = options.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000; // 기본적으로 30일이 지난 데이터는 보강 대상으로 삼습니다

    return candidateMoves.filter(move => {
      const stored = storedEvaluations[move.uci];
      if (!stored) {
        // DB 평가치가 아예 없는 후보수는 로컬 분석 진행
        return true;
      }

      const storedDepth = stored.depth ?? 0;
      if (storedDepth < minDepth) {
        // DB depth가 기준(minDepth)보다 낮으면 로컬 분석을 통해 더 신뢰할 만한 평가치를 생산해냅니다
        return true;
      }

      // 오래된 결과 판별 정책
      const dateStr = stored.updatedAt || stored.createdAt;
      if (dateStr) {
        try {
          const lastUpdated = new Date(dateStr).getTime();
          const ageMs = Date.now() - lastUpdated;
          if (ageMs > maxAgeMs) {
            return true;
          }
        } catch (e) {
          // 날짜 파싱 실패 시 예외 처리 및 보수적으로 로컬 분석 대상에 포함
          return true;
        }
      }

      return false;
    });
  }
}

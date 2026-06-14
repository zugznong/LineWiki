import type { EngineMoveEvaluation, MergedMoveEvaluation } from './AnalysisTypes';
import { parseMoveAnnotation, getMoveAnnotationCount, getMoveAnnotationScore } from '../chess/MoveAnnotation';

export function getEvalScoreValue(evalItem: EngineMoveEvaluation | MergedMoveEvaluation | undefined | null): number | null {
  if (!evalItem || !evalItem.score) return null;
  const score = evalItem.score;
  if (score.type === 'mate') {
    if (score.value > 0) {
      return 100000 - score.value;
    } else {
      return -100000 - score.value;
    }
  }
  return score.value;
}

export function getMovePriority(m: { san: string; promotion?: string | null }): number {
  const annotation = parseMoveAnnotation(m.san);
  return getMoveAnnotationScore(annotation);
}

/**
 * 정렬 tie-breaker를 수행합니다.
 * 순서: annotationCount desc -> mate desc -> check desc -> capture desc -> promotion desc -> SAN asc
 */
export function compareTieBreaker(a: { san: string }, b: { san: string }): number {
  const annA = parseMoveAnnotation(a.san);
  const annB = parseMoveAnnotation(b.san);

  const countA = getMoveAnnotationCount(annA);
  const countB = getMoveAnnotationCount(annB);
  if (countA !== countB) {
    return countB - countA;
  }

  const mateA = annA.isMate ? 1 : 0;
  const mateB = annB.isMate ? 1 : 0;
  if (mateA !== mateB) {
    return mateB - mateA;
  }

  const checkA = annA.isCheck ? 1 : 0;
  const checkB = annB.isCheck ? 1 : 0;
  if (checkA !== checkB) {
    return checkB - checkA;
  }

  const captureA = annA.isCapture ? 1 : 0;
  const captureB = annB.isCapture ? 1 : 0;
  if (captureA !== captureB) {
    return captureB - captureA;
  }

  const promotionA = annA.isPromotion ? 1 : 0;
  const promotionB = annB.isPromotion ? 1 : 0;
  if (promotionA !== promotionB) {
    return promotionB - promotionA;
  }

  return a.san.localeCompare(b.san);
}

export function sortCandidateMoves(
  moves: any[],
  debouncedEvaluations: Record<string, EngineMoveEvaluation | MergedMoveEvaluation>,
  turn: 'w' | 'b',
  sortMode: 'engine' | 'tactical' | 'natural'
): any[] {
  if (sortMode === 'natural') return moves;

  return [...moves].sort((a, b) => {
    if (sortMode === 'engine') {
      const evalA = debouncedEvaluations[a.uci];
      const evalB = debouncedEvaluations[b.uci];
      const scoreA = getEvalScoreValue(evalA);
      const scoreB = getEvalScoreValue(evalB);

      // 둘 다 평가치가 존재할 경우 평가치 기준 정렬
      if (scoreA !== null && scoreB !== null) {
        if (scoreA !== scoreB) {
          if (turn === 'w') {
            return scoreB - scoreA; // 높은 점수 우선 (내림차순)
          } else {
            return scoreA - scoreB; // 낮은 점수 우선 (오름차순)
          }
        }
        
        // 평가치가 같을 경우 tie-breaker 작동
        return compareTieBreaker(a, b);
      }

      // 평가치가 아직 없는 경우, 존재하는 수 우선 배치
      if (scoreA !== null && scoreB === null) return -1;
      if (scoreA === null && scoreB !== null) return 1;

      // 둘 다 평가치가 아직 발견되지 않았다면, tie-breaker 작동
      return compareTieBreaker(a, b);
    }

    // sortMode === 'tactical' (전술 중요도 기준 정렬)
    return compareTieBreaker(a, b);
  });
}


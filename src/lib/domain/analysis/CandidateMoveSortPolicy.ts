import type { EngineMoveEvaluation, MergedMoveEvaluation } from './AnalysisTypes';

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

export function getMovePriority(m: { san: string; promotion?: string | null }) {
  if (m.san.includes('#') || m.san.includes('+')) return 4;
  if (m.san.includes('x')) return 3;
  if (m.promotion || m.san.includes('=')) return 2;
  return 1;
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
        if (turn === 'w') {
          return scoreB - scoreA; // 높은 점수 우선 (내림차순)
        } else {
          return scoreA - scoreB; // 낮은 점수 우선 (오름차순)
        }
      }

      // 평가치가 아직 없는 경우, 존재하는 수 우선 배치
      if (scoreA !== null && scoreB === null) return -1;
      if (scoreA === null && scoreB !== null) return 1;

      // 둘 다 평가치가 아직 발견되지 않았다면, 중요 전술 지표 (체크, 캡처, 프로모션) 우선순위 적용
      const priorityA = getMovePriority(a);
      const priorityB = getMovePriority(b);
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // 전술 우선순위마저 같다면 원래 합법수 리스트 순서(moves의 인덱스)를 보존
      return moves.indexOf(a) - moves.indexOf(b);
    }

    // sortMode === 'tactical' (전술 중요도 기준 정렬)
    const priorityA = getMovePriority(a);
    const priorityB = getMovePriority(b);
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }
    return moves.indexOf(a) - moves.indexOf(b);
  });
}

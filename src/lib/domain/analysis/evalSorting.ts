import { EvalScore } from './EvalScore';

/**
 * 평가 점수(EvalScore)를 정렬 가능한 단일 수치로 환산합니다.
 * 메이트(mate)는 일반 cp 점수보다 항상 우선되도록 ±100000 오프셋을 적용합니다. (백 기준 절대값)
 * 양수 메이트는 수가 작을수록 더 유리하고(더 높은 정렬 값),
 * 음수 메이트는 수가 작을수록(절대값이 작을수록, 즉 빠른 패배) 더 불리합니다(더 낮은 정렬 값).
 */
export function evalSortValue(score: EvalScore): number {
  if (score.isMate()) {
    if (score.value > 0) {
      return 100000 + (1000 - score.value);
    } else {
      const absMate = -score.value;
      return -100000 - (1000 - absMate);
    }
  }
  return score.value;
}

/**
 * 현재 차례(turn)에 따라 "더 좋은 수"가 앞에 오도록 정렬하는 비교자(comparator)를 생성합니다.
 * 백('w') 차례면 높은 점수가, 흑('b') 차례면 낮은 점수가 우선합니다.
 *
 * EnginePanel의 최선 수 선정과 추천 목록 정렬에서 공유되어 중복 로직을 제거합니다.
 */
export function compareEvalsForTurn<T extends { score: EvalScore }>(
  turn: string
): (a: T, b: T) => number {
  const normalizedTurn = turn === 'b' ? 'b' : 'w';
  return (a, b) => {
    const valA = evalSortValue(a.score);
    const valB = evalSortValue(b.score);
    return normalizedTurn === 'w' ? valB - valA : valA - valB;
  };
}

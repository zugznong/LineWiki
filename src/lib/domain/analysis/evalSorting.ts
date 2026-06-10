import type { EvalScore } from './EvalScore';

/**
 * 평가 점수(EvalScore)를 정렬 가능한 단일 수치로 환산합니다.
 * 메이트(mate)는 일반 cp 점수보다 항상 우선되도록 ±10000 오프셋을 적용합니다. (백 기준 절대값)
 */
export function evalSortValue(score: EvalScore): number {
  if (score.isMate()) {
    return score.value > 0 ? 10000 + score.value : -10000 + score.value;
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
  return (a, b) => {
    const valA = evalSortValue(a.score);
    const valB = evalSortValue(b.score);
    return turn === 'w' ? valB - valA : valA - valB;
  };
}

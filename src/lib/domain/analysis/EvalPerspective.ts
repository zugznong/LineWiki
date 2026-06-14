import { EvalScore } from './EvalScore';

/**
 * Stockfish가 현재 차례(Active Player) 기준으로 출력한 상대 평가 점수를
 * LineWiki 사양에 맞추어 항상 '백색(White) 관점'의 절대 점수로 정규화하는 순수 함수입니다.
 */
export function normalizeToWhitePerspective(score: EvalScore, fen: string): EvalScore {
  if (!fen) return score;
  const parts = fen.trim().split(/\s+/);
  const activeColor = parts[1] || 'w';

  // 흑 차례('b')일 경우 가치 평가 부호를 반전해 항상 백 관점의 점수로 정밀 보정합니다.
  if (activeColor === 'b') {
    return new EvalScore(score.type, -score.value);
  }
  return score;
}

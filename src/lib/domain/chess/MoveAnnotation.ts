import type { PieceType } from './ChessTypes';

export interface MoveAnnotation {
  isCapture: boolean;
  isCheck: boolean;
  isMate: boolean;
  isPromotion: boolean;
  promotionPiece: PieceType | string | null;
}

export function parseMoveAnnotation(san: string): MoveAnnotation {
  const isCheck = san.includes('+') || san.includes('#');
  const isMate = san.includes('#');
  const isCapture = san.includes('x');
  const isPromotion = san.includes('=');
  
  let promotionPiece: PieceType | string | null = null;
  if (isPromotion) {
    const parts = san.split('=');
    if (parts.length > 1) {
      // e.g. exd8=Q+ -> parts[1] is Q+
      const cleanPieceStr = parts[1].replace('+', '').replace('#', '').trim();
      promotionPiece = cleanPieceStr.toLowerCase() as PieceType;
    }
  }

  return {
    isCapture,
    isCheck, // isMate인 경우에도 isCheck는 true로 유지
    isMate,
    isPromotion,
    promotionPiece
  };
}

/**
 * 주석 처리된 특징(캡처, 체크/메이트, 프로모션)들의 개수를 중복 없이 독립적으로 가산하여 반환합니다.
 * 메이트(#)는 체크(+)의 조건 강화이므로, 하나의 "체크/메이트" 독립 카테고리로 묶어 중복 가산을 방지합니다.
 */
export function getMoveAnnotationCount(annotation: MoveAnnotation): number {
  let count = 0;
  if (annotation.isCapture) count++;
  if (annotation.isPromotion) count++;
  if (annotation.isMate || annotation.isCheck) count++;
  return count;
}

/**
 * 전술 정렬 우선순위에서 Qxf7#과 같이 복합 주석을 가지는 유기적 가중치를 산출합니다.
 * mate > check를 엄밀하게 보장하도록 mate는 30점, check는 20점, capture는 10점, promotion은 5점으로 설계하여
 * 복수 조건이 만날 시 주석 개수와 위상이 비례하도록 가중치를 다이나믹하게 누계합니다.
 */
export function getMoveAnnotationScore(annotation: MoveAnnotation): number {
  let score = 0;
  if (annotation.isCapture) score += 10;
  if (annotation.isPromotion) score += 5;
  if (annotation.isMate) {
    score += 30; // mate > check(20)
  } else if (annotation.isCheck) {
    score += 20;
  }
  return score;
}


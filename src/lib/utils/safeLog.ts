/**
 * 개인정보/연구 데이터 유출을 방지하기 위한 안전 로깅 유틸리티입니다.
 *
 * 사용자의 체스 연구 국면(FEN)은 그 자체로 사용자의 관심사·연구 라인을 드러낼 수 있고,
 * 향후 로그인/계정 기능이 도입되면 계정과 연결될 수 있는 민감 정보입니다. 따라서 원본 FEN을
 * 로그에 그대로 남기지 않고, 비암호화(non-crypto) 짧은 해시로 치환해 디버깅에 필요한
 * "동일 국면 여부" 상관관계만 유지합니다.
 */

/**
 * FNV-1a 32비트 해시. 의존성 없이 결정적(deterministic)이며 동기적으로 동작합니다.
 * 암호학적 용도가 아니라 로그 상관관계 식별용입니다.
 */
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 원본 FEN을 노출하지 않는 안전한 로그 토큰을 생성합니다. 예: "fen#1a2b3c4d".
 * 빈 값은 "fen(empty)"로 표시합니다.
 */
export function redactFen(fen: string | null | undefined): string {
  if (!fen) return 'fen(empty)';
  return `fen#${hashString(fen)}`;
}

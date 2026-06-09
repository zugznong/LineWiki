import type { Result } from '../../utils/result';
import { success, failure } from '../../utils/result';
import { InvalidFenError } from './Fen';

/**
 * FEN 입력에 대한 중앙 집중식 안전성 검증 유틸리티입니다.
 *
 * chess.js 또는 도메인 구조 검증 이전 단계에서, 길이 제한과 문자 화이트리스트를 통해
 * 과도하게 길거나 제어 문자(CR/LF, 널 바이트 등) 또는 꺾쇠 괄호가 포함된 비정상 입력을
 * 사전에 차단합니다. URL 라우트(UrlFen)와 UCI 명령어 빌더가 동일한 규칙을 공유하도록
 * 단일 출처(single source of truth)로 분리되어 있습니다.
 */

/** URL 세그먼트로 들어오는 원본 FEN 문자열의 최대 허용 길이입니다. */
export const MAX_URL_FEN_LENGTH = 256;

/** 복원된 표준 FEN 문자열의 최대 허용 길이입니다. (표준 시작 FEN은 약 56자) */
export const MAX_FEN_LENGTH = 160;

// URL-safe FEN 세그먼트 화이트리스트: 기물/필드 문자 + 슬래시(/) + 언더바(_) + 공백 + 하이픈(-).
const URL_FEN_PATTERN = /^[A-Za-z0-9/_ -]+$/;

// 복원된 표준 FEN 화이트리스트: 언더바는 공백으로 복원되었으므로 제외됩니다.
const STANDARD_FEN_PATTERN = /^[A-Za-z0-9/ -]+$/;

/**
 * URL 세그먼트로 전달된 원본 FEN 문자열의 안전성을 검증합니다.
 * 길이 초과, 제어 문자, 널 바이트, 꺾쇠 괄호 등을 거부하고, 통과 시 원본 문자열을 그대로 반환합니다.
 */
export function ensureSafeUrlFenSegment(raw: string): Result<string, InvalidFenError> {
  if (!raw) {
    return failure(new InvalidFenError('FEN URL 입력이 비어 있습니다.'));
  }
  if (raw.length > MAX_URL_FEN_LENGTH) {
    return failure(
      new InvalidFenError(
        `FEN URL 입력이 허용 최대 길이(${MAX_URL_FEN_LENGTH}자)를 초과했습니다.`
      )
    );
  }
  if (!URL_FEN_PATTERN.test(raw)) {
    return failure(
      new InvalidFenError('FEN URL 입력에 허용되지 않은 문자가 포함되어 있습니다.')
    );
  }
  return success(raw);
}

/**
 * 복원/디코딩된 표준 FEN 문자열의 안전성을 검증합니다.
 * 도메인 구조 검증(Fen.create) 또는 UCI 명령어 생성 이전에 호출되어야 합니다.
 * 통과 시 양끝 공백이 제거된 문자열을 반환합니다.
 */
export function ensureSafeFenString(fen: string): Result<string, InvalidFenError> {
  if (!fen) {
    return failure(new InvalidFenError('FEN 문자열이 비어 있습니다.'));
  }
  const trimmed = fen.trim();
  if (!trimmed) {
    return failure(new InvalidFenError('FEN 문자열이 비어 있습니다.'));
  }
  if (trimmed.length > MAX_FEN_LENGTH) {
    return failure(
      new InvalidFenError(`FEN 문자열이 허용 최대 길이(${MAX_FEN_LENGTH}자)를 초과했습니다.`)
    );
  }
  if (!STANDARD_FEN_PATTERN.test(trimmed)) {
    return failure(
      new InvalidFenError('FEN 문자열에 허용되지 않은 문자(제어 문자 등)가 포함되어 있습니다.')
    );
  }
  return success(trimmed);
}

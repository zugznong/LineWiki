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
export const MAX_URL_FEN_LENGTH = 240;

/** 복원된 표준 FEN 문자열의 최대 허용 길이입니다. (표준 시작 FEN은 약 56자) */
export const MAX_FEN_LENGTH = 240;

// URL-safe FEN 세그먼트 화이트리스트: 기물/필드 문자 + 슬래시(/) + 언더바(_) + 하이픈(-).
const SAFE_URL_FEN_PATTERN = /^[A-Za-z0-9/_-]+$/;

// 복원된 표준 FEN 화이트리스트: 언더바는 공백으로 복원되었으므로 제외됩니다.
const SAFE_STANDARD_FEN_PATTERN = /^[A-Za-z0-9/ -]+$/;

/**
 * URL 경로 세그먼트로 전달된 FEN 표현이 안전한 문자 집합과 길이 제한을 지키는지 검증합니다.
 *
 * 이 단계에서는 아직 `_`를 공백으로 복원하지 않습니다.
 */
export function ensureSafeUrlFenSegment(value: string): Result<string, InvalidFenError> {
  if (!value) {
    return failure(new InvalidFenError('URL FEN 문자열이 비어 있습니다.'));
  }

  if (value.length > MAX_URL_FEN_LENGTH) {
    return failure(new InvalidFenError(`URL FEN의 길이가 너무 깁니다. (최대 길이: ${MAX_URL_FEN_LENGTH}자, 현재: ${value.length}자)`));
  }

  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return failure(new InvalidFenError('URL FEN에 제어 문자가 포함되어 있습니다.'));
  }

  if (/[<>\\]/.test(value)) {
    return failure(new InvalidFenError('URL FEN에 허용되지 않는 특수문자나 허가되지 않은 기호가 들어갔습니다.'));
  }

  if (!SAFE_URL_FEN_PATTERN.test(value)) {
    return failure(new InvalidFenError('URL FEN에 허용되지 않는 특수문자나 허가되지 않은 기호가 들어갔습니다.'));
  }

  return success(value);
}

/**
 * URL 세그먼트에서 복원된 표준 FEN 문자열이 안전한 문자 집합과 길이 제한을 지키는지 검증합니다.
 *
 * 이 함수는 chess.js/Fen 도메인 검증 이전의 방어 계층입니다.
 */
export function ensureSafeFenString(value: string): Result<string, InvalidFenError> {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return failure(new InvalidFenError('FEN 문자열이 비어 있습니다.'));
  }

  if (trimmedValue.length > MAX_FEN_LENGTH) {
    return failure(new InvalidFenError(`FEN 문자열의 길이가 너무 깁니다. (최대 길이: ${MAX_FEN_LENGTH}자, 현재: ${trimmedValue.length}자)`));
  }

  if (/[\u0000-\u001F\u007F]/.test(trimmedValue)) {
    return failure(new InvalidFenError('FEN 문자열에 제어 문자가 포함되어 있습니다.'));
  }

  if (/[<>\\]/.test(trimmedValue)) {
    return failure(new InvalidFenError('FEN 문자열에 허용되지 않는 특수문자나 허가되지 않은 기호가 들어갔습니다.'));
  }

  if (!SAFE_STANDARD_FEN_PATTERN.test(trimmedValue)) {
    return failure(new InvalidFenError('FEN 문자열에 허용되지 않는 특수문자나 허가되지 않은 기호가 들어갔습니다.'));
  }

  return success(trimmedValue);
}
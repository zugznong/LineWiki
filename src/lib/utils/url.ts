import { Fen } from '../domain/chess/Fen';
import { UrlFen } from '../domain/chess/UrlFen';

export function parseUrlSafeFen(urlSafeStr: string): string | null {
  const result = UrlFen.toStandardFen(urlSafeStr);
  if (result.isOk()) {
    return result.unwrap().toString();
  }
  return null;
}

export function buildUrlSafeFen(standardFen: string): string {
  const result = Fen.create(standardFen);
  if (result.isOk()) {
    return UrlFen.fromStandardFen(result.unwrap()).toString();
  }
  return '';
}

/**
 * 클라이언트 라우팅에 사용할 수 있는 안전한 "내부" 경로인지 검증합니다.
 *
 * 오픈 리다이렉트 및 위험 스킴(javascript:, data:) 내비게이션을 사전 차단하기 위한 방어적 검사입니다.
 * 단일 슬래시로 시작하는 내부 절대경로만 허용하며, 프로토콜 상대 URL(//host), 백슬래시,
 * 제어 문자, 외부 스킴을 모두 거부합니다.
 */
export function isSafeInternalPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0) return false;
  // 반드시 단일 슬래시로 시작하는 내부 절대경로여야 합니다. (https:, javascript:, data: 등 차단)
  if (path[0] !== '/') return false;
  // 프로토콜 상대 URL(//evil.com) 차단.
  if (path[1] === '/') return false;
  // 제어 문자(개행/탭/널 등)와 백슬래시 거부 — 일부 브라우저는 \ 를 / 로 해석합니다.
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return false;
    if (path[i] === '\\') return false;
  }
  return true;
}

/**
 * Joins URL path segments securely, cleaning up duplicate slashes.
 */
export function joinSegments(...segments: string[]): string {
  return segments
    .map(seg => seg.trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

/**
 * Splits a URL path into an array of non-empty segments.
 */
export function splitSegments(path: string): string[] {
  return path
    .split('/')
    .map(seg => seg.trim())
    .filter(Boolean);
}

/**
 * Generates an sanitized path or slug from a given string.
 * Keeps alphanumeric characters, korean letters, and safe delimiters.
 */
export function sanitizePath(pathStr: string): string {
  return pathStr
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-_]/gi, '') // Remove unsafe characters except standard alphabets, numbers, Korean, whitespace, hyphens, underscores
    .replace(/\s+/g, '-')                // Replace spaces with hyphens
    .replace(/-+/g, '-')                  // Deduplicate hyphens
    .replace(/^-+|-+$/g, '');            // Trim leading/trailing hyphens
}

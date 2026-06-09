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

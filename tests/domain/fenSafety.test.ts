import { describe, it, expect } from 'vitest';
import {
  ensureSafeUrlFenSegment,
  ensureSafeFenString,
  MAX_URL_FEN_LENGTH,
  MAX_FEN_LENGTH
} from '../../src/lib/domain/chess/fenSafety';

describe('fenSafety - ensureSafeUrlFenSegment', () => {
  it('accepts a valid url-safe FEN segment', () => {
    const seg = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
    const result = ensureSafeUrlFenSegment(seg);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.unwrap()).toBe(seg);
  });

  it('rejects empty input', () => {
    expect(ensureSafeUrlFenSegment('').isFailure()).toBe(true);
  });

  it('rejects oversized input beyond MAX_URL_FEN_LENGTH', () => {
    const oversized = 'r'.repeat(MAX_URL_FEN_LENGTH + 1);
    const result = ensureSafeUrlFenSegment(oversized);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('최대 길이');
  });

  it('rejects CR/LF injection attempts', () => {
    expect(ensureSafeUrlFenSegment('rnbq\n8/8_w_-_-_0_1').isFailure()).toBe(true);
    expect(ensureSafeUrlFenSegment('rnbq\r\n8_w').isFailure()).toBe(true);
  });

  it('rejects null bytes and control characters', () => {
    expect(ensureSafeUrlFenSegment('rnbq\x008_w').isFailure()).toBe(true);
    expect(ensureSafeUrlFenSegment('rnbq\t8_w').isFailure()).toBe(true);
  });

  it('rejects angle brackets (potential injection markers)', () => {
    expect(ensureSafeUrlFenSegment('<script>_w').isFailure()).toBe(true);
  });
});

describe('fenSafety - ensureSafeFenString', () => {
  it('accepts a valid standard FEN and trims it', () => {
    const result = ensureSafeFenString('  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1  ');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.unwrap()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }
  });

  it('rejects empty / whitespace-only input', () => {
    expect(ensureSafeFenString('').isFailure()).toBe(true);
    expect(ensureSafeFenString('   ').isFailure()).toBe(true);
  });

  it('rejects oversized input beyond MAX_FEN_LENGTH', () => {
    const result = ensureSafeFenString('8/'.repeat(MAX_FEN_LENGTH));
    expect(result.isFailure()).toBe(true);
  });

  it('rejects newline-based UCI injection payloads', () => {
    const result = ensureSafeFenString('8/8/8/8/8/8/8/8 w - - 0 1\ngo infinite');
    expect(result.isFailure()).toBe(true);
  });

  it('rejects control characters and angle brackets', () => {
    expect(ensureSafeFenString('8/8/8/8/8/8/8/8 w\x00').isFailure()).toBe(true);
    expect(ensureSafeFenString('8/8/8/8/8/8/8/8 <b>').isFailure()).toBe(true);
  });
});

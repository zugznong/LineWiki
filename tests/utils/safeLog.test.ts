import { describe, it, expect } from 'vitest';
import { hashString, redactFen } from '../../src/lib/utils/safeLog';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('safeLog.hashString', () => {
  it('is deterministic for the same input', () => {
    expect(hashString(START_FEN)).toBe(hashString(START_FEN));
  });

  it('produces an 8-char hex token', () => {
    expect(hashString(START_FEN)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('differs for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('safeLog.redactFen', () => {
  it('never includes the raw FEN string', () => {
    const token = redactFen(START_FEN);
    expect(token).not.toContain('rnbqkbnr');
    expect(token).not.toContain(' w ');
    expect(token).toMatch(/^fen#[0-9a-f]{8}$/);
  });

  it('handles empty / null / undefined safely', () => {
    expect(redactFen('')).toBe('fen(empty)');
    expect(redactFen(null)).toBe('fen(empty)');
    expect(redactFen(undefined)).toBe('fen(empty)');
  });

  it('maps identical positions to the same token (debug correlation)', () => {
    expect(redactFen(START_FEN)).toBe(redactFen(START_FEN));
  });
});

import { describe, it, expect } from 'vitest';
import { Fen } from '../../src/lib/domain/chess/Fen';

describe('Fen Security Validation Tests', () => {
  it('should reject FEN strings longer than 240 characters', () => {
    const longFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' + ' '.repeat(200);
    const result = Fen.create(longFen);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('최대 안전 길이를 초과했습니다');
  });

  it('should reject excessively large halfmove values', () => {
    const badHalfmove = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 10000 1';
    const result = Fen.create(badHalfmove);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('유효하지 않거나 너무 긴 halfmove clock');
  });

  it('should reject excessively large fullmove values', () => {
    const badFullmove = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 100000';
    const result = Fen.create(badFullmove);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('유효하지 않거나 너무 긴 fullmove number');
  });

  it('should fail with invalid characters in board description', () => {
    const maliciousBoard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPP<script>PP/RNBQKBNR w KQkq - 0 1';
    const result = Fen.create(maliciousBoard);
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('유효하지 않은 기물 혹은 문자');
  });
});

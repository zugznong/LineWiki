import { describe, it, expect } from 'vitest';
import { LineHistory } from '../../src/lib/domain/chess/LineHistory';
import { Fen } from '../../src/lib/domain/chess/Fen';

describe('LineHistory Security and Integrity Tests', () => {
  it('should successfully parse valid session history items', () => {
    const validData = [
      {
        fen: Fen.START_POSITION,
        moveSan: 'e4',
        from: 'e2',
        to: 'e4'
      }
    ];
    const result = LineHistory.deserialize(JSON.stringify(validData));
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().items.length).toBe(1);
    expect(result.unwrap().items[0].moveSan).toBe('e4');
  });

  it('should successfully parse standard complex SAN moves like exd5, Qxe7+, axb8=Q#, O-O+, O-O-O#', () => {
    const complexMoves = ['exd5', 'Qxe7+', 'axb8=Q#', 'O-O+', 'O-O-O#', '0-0+', '0-0-0#', 'Nxf3', 'N1f3', 'N1xf3', 'Ncd7'];
    for (const move of complexMoves) {
      const data = [
        {
          fen: Fen.START_POSITION,
          moveSan: move,
          from: 'e2',
          to: 'e4'
        }
      ];
      const result = LineHistory.deserialize(JSON.stringify(data));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().items[0].moveSan).toBe(move);
    }
  });

  it('should reject non-array JSON inputs', () => {
    const badData = { fen: Fen.START_POSITION };
    const result = LineHistory.deserialize(JSON.stringify(badData));
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('배열 구조가 아닙니다');
  });

  it('should reject more than 300 history items', () => {
    const manyItems = Array.from({ length: 301 }, () => ({
      fen: Fen.START_POSITION,
      moveSan: 'e4',
      from: 'e2',
      to: 'e4'
    }));
    const result = LineHistory.deserialize(JSON.stringify(manyItems));
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('최대 상한(300개)을 초과했습니다');
  });

  it('should reject items with invalid FENs', () => {
    const invalidItems = [
      {
        fen: 'invalid-fen-string',
        moveSan: 'e4',
        from: 'e2',
        to: 'e4'
      }
    ];
    const result = LineHistory.deserialize(JSON.stringify(invalidItems));
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('유효하지 않은 FEN 패턴');
  });

  it('should reject excessively long or pattern-breaking moveSan values', () => {
    const longSanItems = [
      {
        fen: Fen.START_POSITION,
        moveSan: 'e4eeeeeeeeeeeeee',
        from: 'e2',
        to: 'e4'
      }
    ];
    const result1 = LineHistory.deserialize(JSON.stringify(longSanItems));
    expect(result1.isFailure()).toBe(true);

    const patternBreakerItems = [
      {
        fen: Fen.START_POSITION,
        moveSan: 'e4<script>',
        from: 'e2',
        to: 'e4'
      }
    ];
    const result2 = LineHistory.deserialize(JSON.stringify(patternBreakerItems));
    expect(result2.isFailure()).toBe(true);
  });

  it('should reject invalid from/to coordinates', () => {
    const invalidCoords = [
      {
        fen: Fen.START_POSITION,
        moveSan: 'e4',
        from: 'e9', // Invalid coordinate row 9
        to: 'e4'
      }
    ];
    const result = LineHistory.deserialize(JSON.stringify(invalidCoords));
    expect(result.isFailure()).toBe(true);
    expect(result.unwrapErr().message).toContain('유효하지 않은 출발 좌표 구조');
  });

  it('should reject session history if it contains move turn rule violations (e.g., King attacked and it is the other side to move)', () => {
    // 1. White to move ('w') but black king (e8) is under attack by White rook (e2)
    const whiteToMoveBlackAttacked = [
      {
        fen: '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1',
        moveSan: null,
        from: null,
        to: null
      }
    ];
    const result1 = LineHistory.deserialize(JSON.stringify(whiteToMoveBlackAttacked));
    expect(result1.isFailure()).toBe(true);
    expect(result1.unwrapErr().message).toContain('체스 규정 위반');

    // 2. Black to move ('b') but white king (e1) is under attack by Black rook (e2)
    const blackToMoveWhiteAttacked = [
      {
        fen: '4k3/8/8/8/8/8/4r3/4K3 b - - 0 1',
        moveSan: null,
        from: null,
        to: null
      }
    ];
    const result2 = LineHistory.deserialize(JSON.stringify(blackToMoveWhiteAttacked));
    expect(result2.isFailure()).toBe(true);
    expect(result2.unwrapErr().message).toContain('체스 규정 위반');
  });
});

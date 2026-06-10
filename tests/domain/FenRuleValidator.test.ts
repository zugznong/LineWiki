import { describe, it, expect } from 'vitest';
import { FenRuleValidator } from '../../src/lib/domain/chess/FenRuleValidator';

describe('FenRuleValidator Domain Rule Tests', () => {
  it('should pass for a valid standard position including opposition (the user example)', () => {
    // 8/8/3k4/3P4/3K4/8/8/8 w - - 0 1
    // White king at d4, Black king at d6. Distance is 2 vertically, so they are not neighboring.
    // White's turn ('w'), black king at d6 is not attacked by any white pieces (the only pawn d5 attacks e6/c6).
    const validOpposition = '8/8/3k4/3P4/3K4/8/8/8 w - - 0 1';
    expect(FenRuleValidator.validateLegalSideToMoveState(validOpposition)).toBe(true);
  });

  it('should fail when it is white to move but black king is directly attacked by a white pawn', () => {
    // 8/8/4k3/3P4/4K3/8/8/8 w - - 0 1
    // White's turn ('w') but Black's king on e6 is under attack by the white pawn on d5.
    // This is impossible because if white has just made a checking move, it should be Black's turn to respond.
    const invalidBlackCheckingTurn = '8/8/4k3/3P4/4K3/8/8/8 w - - 0 1';
    expect(FenRuleValidator.validateLegalSideToMoveState(invalidBlackCheckingTurn)).toBe(false);
  });

  it('should fail when it is black to move but white king is directly checked/attacked by a black rook', () => {
    // 4k3/8/8/8/8/8/4K3/4r3 b - - 0 1
    // Black's turn ('b'), but White's king on e2 is under attack by the black rook on e1.
    // This is illegal since if Black has just delivered a check, it would be White's turn to react.
    const invalidWhiteCheckingTurn = '4k3/8/8/8/8/8/4K3/4r3 b - - 0 1';
    expect(FenRuleValidator.validateLegalSideToMoveState(invalidWhiteCheckingTurn)).toBe(false);
  });

  it('should fail when two kings are adjacent to each other anywhere', () => {
    // Kings at d5 and c5 (distance 1 horizontally, adjacent)
    const adjacentKings = '8/8/8/2kK4/8/8/8/8 w - - 0 1';
    expect(FenRuleValidator.validateLegalSideToMoveState(adjacentKings)).toBe(false);
  });

  it('should pass on standard starting position', () => {
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(FenRuleValidator.validateLegalSideToMoveState(startingFen)).toBe(true);
  });
});

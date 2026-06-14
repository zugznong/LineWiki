import { describe, it, expect } from 'vitest';
import { ChessJsEngineAdapter } from '../../src/lib/adapters/chess/ChessJsEngineAdapter';
import { GetPromotionOptionsUseCase } from '../../src/lib/application/chess/GetPromotionOptionsUseCase';

describe('GetPromotionOptionsUseCase Use Case Tests', () => {
  const chessEngine = new ChessJsEngineAdapter();
  const getPromotionOptions = new GetPromotionOptionsUseCase(chessEngine);

  it('should return 4 basic promotion options for White pawn promotion', () => {
    // White pawn on e7, ready to advance to e8
    const fen = '8/4P3/8/8/8/8/8/k6K w - - 0 1';
    const options = getPromotionOptions.execute(fen, 'e7', 'e8');

    expect(options).toContain('q');
    expect(options).toContain('r');
    expect(options).toContain('b');
    expect(options).toContain('n');
    expect(options.length).toBe(4);
  });

  it('should return 4 basic promotion options for Black pawn promotion', () => {
    // Black pawn on e2, ready to advance to e1
    const fen = 'k6K/8/8/8/8/8/4p3/8 b - - 0 1';
    const options = getPromotionOptions.execute(fen, 'e2', 'e1');

    expect(options).toContain('q');
    expect(options).toContain('r');
    expect(options).toContain('b');
    expect(options).toContain('n');
    expect(options.length).toBe(4);
  });

  it('should handle promotion with capture successfully', () => {
    // White pawn on e7, black rook on d8
    const fen = '3r4/4P3/8/8/8/8/8/k6K w - - 0 1';
    const options = getPromotionOptions.execute(fen, 'e7', 'd8');

    expect(options).toContain('q');
    expect(options).toContain('r');
    expect(options).toContain('b');
    expect(options).toContain('n');
    expect(options.length).toBe(4);
  });

  it('should handle promotion with giving check to enemy king', () => {
    // White pawn on e7, black king on c8.
    // e7e8=Q represents a direct check to the king on c8.
    const fen = '2k5/4P3/8/8/8/8/8/7K w - - 0 1';
    const options = getPromotionOptions.execute(fen, 'e7', 'e8');

    expect(options).toContain('q');
    expect(options).toContain('r');
    expect(options).toContain('b');
    expect(options).toContain('n');
    expect(options.length).toBe(4);
  });

  it('should return empty list if movement is not a pawn promotion', () => {
    // e7e6 is not a promotion (does not reach 8th rank)
    const fen = '8/4P3/8/8/8/8/8/k6K w - - 0 1';
    const options = getPromotionOptions.execute(fen, 'e7', 'e6');

    expect(options).toEqual([]);
  });

  it('should return empty list if a minor piece slides to the back rank', () => {
    // White rook on a7 slides to a8
    const fen = 'R7/8/8/8/8/8/8/k6K w - - 0 1';
    const options = getPromotionOptions.execute(fen, 'a8', 'a7'); // Rook moving back is not a promotion

    expect(options).toEqual([]);
  });
});

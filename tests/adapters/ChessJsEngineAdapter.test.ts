import { describe, it, expect, vi } from 'vitest';
import { ChessJsEngineAdapter } from '../../src/lib/adapters/chess/ChessJsEngineAdapter';
import { Fen } from '../../src/lib/domain/chess/Fen';

describe('ChessJsEngineAdapter Tests', () => {
  const adapter = new ChessJsEngineAdapter();

  describe('validateFen', () => {
    it('should validate standard opening position FEN', () => {
      const isValid = adapter.validateFen(Fen.START_POSITION);
      expect(isValid).toBe(true);
    });

    it('should identify a valid mid-game FEN', () => {
      const validMidFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
      const isValid = adapter.validateFen(validMidFen);
      expect(isValid).toBe(true);
    });

    it('should invalidate an obviously malformed FEN string', () => {
      const badFen = 'not-a-valid-fen-at-all';
      const isValid = adapter.validateFen(badFen);
      expect(isValid).toBe(false);
    });

    it('should return false for empty or non-string inputs', () => {
      expect(adapter.validateFen('')).toBe(false);
      expect(adapter.validateFen(null as any)).toBe(false);
    });
  });

  describe('isCheck / isCheckmate / isDraw', () => {
    it('should detect when side to move is not in check', () => {
      const startFen = Fen.create(Fen.START_POSITION).unwrap();
      expect(adapter.isCheck(startFen)).toBe(false);
      expect(adapter.isCheckmate(startFen)).toBe(false);
      expect(adapter.isDraw(startFen)).toBe(false);
    });

    it('should detect a check state', () => {
      // White is in check (Black bishop on b4, white king on e1, e4 played, etc)
      const checkFenStr = 'rnbqk1nr/pppp1ppp/8/4p3/1b2P3/3P4/PPP2PPP/RNBQKBNR w KQkq - 1 3';
      const fen = Fen.create(checkFenStr).unwrap();
      
      expect(adapter.isCheck(fen)).toBe(true);
      expect(adapter.isCheckmate(fen)).toBe(false);
    });

    it('should detect checkmate state (Scholars Mate end position)', () => {
      // e.g. 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
      const scholarsMateFen = 'r1bqkbnr/pppp1Qpp/2n5/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
      const fen = Fen.create(scholarsMateFen).unwrap();

      expect(adapter.isCheck(fen)).toBe(true);
      expect(adapter.isCheckmate(fen)).toBe(true);
    });

    it('should detect a draw state', () => {
      // 3folds or stale draw, let's use a known stalemated position:
      // White to move but has no legal moves and is not in check
      const stalemateFen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const fen = Fen.create(stalemateFen).unwrap();

      expect(adapter.isDraw(fen)).toBe(true);
    });
  });

  describe('getLegalMoves and makeMove', () => {
    it('should generate all twenty legal moves from start position', () => {
      const startFen = Fen.create(Fen.START_POSITION).unwrap();
      const legalMoves = adapter.getLegalMoves(startFen);

      expect(legalMoves.length).toBe(20);
      
      // Let's check some algebraic moves exist (e.g. e2e4, g1f3)
      const uciMoves = legalMoves.map(m => m.uci);
      expect(uciMoves).toContain('e2e4');
      expect(uciMoves).toContain('g1f3');
    });

    it('should accurately play a legal move and output the matching next FEN representation', () => {
      const startFen = Fen.create(Fen.START_POSITION).unwrap();
      // Get the e2e4 ChessMove
      const legalMoves = adapter.getLegalMoves(startFen);
      const e2e4Move = legalMoves.find(m => m.uci === 'e2e4');
      
      expect(e2e4Move).toBeDefined();
      if (e2e4Move) {
        const nextFen = adapter.makeMove(startFen, e2e4Move);
        // The resulting FEN should match the standard 1. e4 FEN
        expect(nextFen).toContain('4P3');
      }
    });

    it('should return original FEN when attempting to play an invalid move gracefully', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const startFen = Fen.create(Fen.START_POSITION).unwrap();
      const invalidMove: any = {
        from: 'e2',
        to: 'e5',
        promotion: null
      };

      const resultFenStr = adapter.makeMove(startFen, invalidMove);
      expect(resultFenStr).toBe(startFen.toString());

      debugSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});

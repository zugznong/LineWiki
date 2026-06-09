import { describe, it, expect } from 'vitest';
import { StockfishMessageParser } from '../../src/lib/adapters/analysis/local/StockfishMessageParser';

describe('StockfishMessageParser Tests', () => {
  const parser = new StockfishMessageParser();
  const dummyFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  describe('parseInfoLine', () => {
    it('should correctly parse depth, score centipawn, nps, time, and PV list in info string', () => {
      const infoLine = 'info depth 10 seldepth 12 multipv 1 score cp 35 nodes 24000 nps 48000 hashfull 8 time 500 pv e2e4 e7e5 g1f3 b8c6';
      const result = parser.parseInfoLine(infoLine, dummyFen);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.depth).toBe(10);
        expect(result.score.isCp()).toBe(true);
        expect(result.score.isMate()).toBe(false);
        expect(result.score.format()).toBe('+0.35');
        
        expect(result.nps).toBe(48000);
        expect(result.timeMs).toBe(500);
        expect(result.bestMoveUci).toBe('e2e4');
        expect(result.pv.getUciMoves()).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6']);
        expect(result.fen).toBe(dummyFen);
        expect(result.state).toBe('analyzing');
      }
    });

    it('should parse negative centipawn score properly', () => {
      const infoLine = 'info depth 6 score cp -120 pv g1f3';
      const result = parser.parseInfoLine(infoLine, dummyFen);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.depth).toBe(6);
        expect(result.score.isCp()).toBe(true);
        expect(result.score.format()).toBe('-1.2');
        expect(result.bestMoveUci).toBe('g1f3');
      }
    });

    it('should parse positive forced mate score properly', () => {
      const infoLine = 'info depth 18 score mate 5 pv h7h8q';
      const result = parser.parseInfoLine(infoLine, dummyFen);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.score.isMate()).toBe(true);
        expect(result.score.isCp()).toBe(false);
        expect(result.score.format()).toBe('M5');
        expect(result.bestMoveUci).toBe('h7h8q');
      }
    });

    it('should parse negative forced mate score properly', () => {
      const infoLine = 'info depth 15 score mate -3 pv d8d1';
      const result = parser.parseInfoLine(infoLine, dummyFen);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.score.isMate()).toBe(true);
        expect(result.score.format()).toBe('-M3');
        expect(result.bestMoveUci).toBe('d8d1');
      }
    });

    it('should return null if the command line is empty or does not involve score or depth details', () => {
      expect(parser.parseInfoLine('', dummyFen)).toBeNull();
      expect(parser.parseInfoLine('option name Hash type spin default 16', dummyFen)).toBeNull();
      expect(parser.parseInfoLine('readyok', dummyFen)).toBeNull();
    });
  });

  describe('parseBestMoveLine', () => {
    it('should parse bestmove and ponder when both are present', () => {
      const bestMoveLine = 'bestmove e2e4 ponder e7e5';
      const result = parser.parseBestMoveLine(bestMoveLine);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.bestMove).toBe('e2e4');
        expect(result.ponder).toBe('e7e5');
      }
    });

    it('should parse bestmove when ponder is absent', () => {
      const bestMoveLine = 'bestmove d2d4';
      const result = parser.parseBestMoveLine(bestMoveLine);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.bestMove).toBe('d2d4');
        expect(result.ponder).toBeNull();
      }
    });

    it('should return null for malformed or other messages', () => {
      expect(parser.parseBestMoveLine('')).toBeNull();
      expect(parser.parseBestMoveLine('info depth 12')).toBeNull();
    });
  });
});

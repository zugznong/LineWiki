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
        expect(result.score.format()).toBe('-1.20');
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

  describe('회귀 테스트 - StockfishMessageParser', () => {
    it('cp, mate, multipv, pv 복합 문자열 파싱 검증', () => {
      const line = 'info depth 11 seldepth 12 multipv 2 score cp 82 nodes 35210 nps 120500 time 292 pv d2d4 g7g6 c2c4 f8g7';
      const parsed = parser.parseInfoLine(line, dummyFen);

      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(parsed.depth).toBe(11);
        expect(parsed.multiPvIndex).toBe(2);
        expect(parsed.score.isCp()).toBe(true);
        expect(parsed.score.format()).toBe('+0.82');
        expect(parsed.bestMoveUci).toBe('d2d4');
        expect(parsed.nodes).toBe(35210);
        expect(parsed.pv.getUciMoves()).toEqual(['d2d4', 'g7g6', 'c2c4', 'f8g7']);
      }
    });

    it('mate 점수 파싱 검증', () => {
      const line1 = 'info depth 20 multipv 1 score mate 3 pv h2h4 e7e5';
      const parsed1 = parser.parseInfoLine(line1, dummyFen);
      expect(parsed1?.score.isMate()).toBe(true);
      expect(parsed1?.score.format()).toBe('M3');

      const line2 = 'info depth 20 multipv 1 score mate -4 pv h2h4 e7e5';
      const parsed2 = parser.parseInfoLine(line2, dummyFen);
      expect(parsed2?.score.isMate()).toBe(true);
      expect(parsed2?.score.format()).toBe('-M4');
    });
  });
});

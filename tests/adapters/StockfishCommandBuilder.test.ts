import { describe, it, expect } from 'vitest';
import {
  StockfishCommandBuilder,
  UnsafeUciCommandError
} from '../../src/lib/adapters/analysis/local/StockfishCommandBuilder';

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('StockfishCommandBuilder.setPosition', () => {
  it('generates a correct UCI position command for a valid FEN', () => {
    expect(StockfishCommandBuilder.setPosition(VALID_FEN)).toBe(`position fen ${VALID_FEN}`);
  });

  it('trims surrounding whitespace before building the command', () => {
    expect(StockfishCommandBuilder.setPosition(`  ${VALID_FEN}  `)).toBe(
      `position fen ${VALID_FEN}`
    );
  });

  it('rejects CR/LF UCI command-injection payloads', () => {
    expect(() => StockfishCommandBuilder.setPosition(`${VALID_FEN}\ngo infinite`)).toThrow(
      UnsafeUciCommandError
    );
    expect(() => StockfishCommandBuilder.setPosition(`${VALID_FEN}\r\nquit`)).toThrow(
      UnsafeUciCommandError
    );
  });

  it('rejects null bytes and control characters', () => {
    expect(() => StockfishCommandBuilder.setPosition(`${VALID_FEN}\x00`)).toThrow(
      UnsafeUciCommandError
    );
  });

  it('rejects oversized input', () => {
    expect(() => StockfishCommandBuilder.setPosition('8/'.repeat(200))).toThrow(
      UnsafeUciCommandError
    );
  });

  it('rejects empty input', () => {
    expect(() => StockfishCommandBuilder.setPosition('')).toThrow(UnsafeUciCommandError);
  });
});

describe('StockfishCommandBuilder other commands', () => {
  it('clamps go depth into a safe range', () => {
    expect(StockfishCommandBuilder.goDepth(10)).toBe('go depth 10');
    expect(StockfishCommandBuilder.goDepth(9999)).toBe('go depth 99');
    expect(StockfishCommandBuilder.goDepth(-5)).toBe('go depth 1');
  });

  it('normalizes setupEngine hash/threads to safe integers', () => {
    const cmds = StockfishCommandBuilder.setupEngine(NaN, -3);
    expect(cmds).toContain('setoption name Hash value 16');
    expect(cmds).toContain('setoption name Threads value 1');

    const clamped = StockfishCommandBuilder.setupEngine(999999, 99999);
    expect(clamped).toContain('setoption name Hash value 4096');
    expect(clamped).toContain('setoption name Threads value 1024');
  });

  it('emits static control commands verbatim', () => {
    expect(StockfishCommandBuilder.uci()).toBe('uci');
    expect(StockfishCommandBuilder.isReady()).toBe('isready');
    expect(StockfishCommandBuilder.stop()).toBe('stop');
    expect(StockfishCommandBuilder.quit()).toBe('quit');
  });
});

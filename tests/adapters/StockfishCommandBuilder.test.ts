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

  describe('회귀 테스트 - StockfishCommandBuilder', () => {
    it('옵션 적용 순서 검증 (setupEngine)', () => {
      const cmds = StockfishCommandBuilder.setupEngine(32, 4);
      // 순서는 uci, Threads, Hash, isready 순이어야 합니다.
      expect(cmds[0]).toBe('uci');
      expect(cmds[1]).toBe('setoption name Threads value 4');
      expect(cmds[2]).toBe('setoption name Hash value 32');
      expect(cmds[3]).toBe('isready');
    });

    it('MultiPV 1~500 수치 제한 검증', () => {
      expect(StockfishCommandBuilder.setMultiPv(0)).toBe('setoption name MultiPV value 1');
      expect(StockfishCommandBuilder.setMultiPv(5)).toBe('setoption name MultiPV value 5');
      expect(StockfishCommandBuilder.setMultiPv(800)).toBe('setoption name MultiPV value 500');
    });

    it('노드 예산 설정 및 clamping 검증 (goNodes / go)', () => {
      expect(StockfishCommandBuilder.goNodes(-100)).toBe('go nodes 1');
      expect(StockfishCommandBuilder.goNodes(50000)).toBe('go nodes 50000');
      // go(params) 안에서의 nodes clamping 도 검증합니다.
      expect(StockfishCommandBuilder.go({ nodes: 2500000000 })).toBe('go nodes 2000000000');
    });

    it('searchmoves 주입 및 프로모션 UCI 검증', () => {
      // 1. 이상하거나 유효하지 않은 포맷 무시
      const cmdWithInvalid = StockfishCommandBuilder.go({
        searchmoves: ['invalid_move', 'e2e4', 'g1f3']
      });
      expect(cmdWithInvalid).toContain('searchmoves e2e4 g1f3');
      expect(cmdWithInvalid).not.toContain('invalid_move');

      // 2. 프로모션 UCI (5자리 문자열 예: e7e8q)는 유효해야 함
      const cmdWithPromotion = StockfishCommandBuilder.go({
        searchmoves: ['e7e8q', 'b2b1r', 'd7d5']
      });
      expect(cmdWithPromotion).toContain('searchmoves e7e8q b2b1r d7d5');
    });

    it('go({ targetDepth: 20 }) 및 go({ nodes: ... }) 타겟 depth / 노드 제한 명령어 검증 및 depth 보장 모드에서 nodes 혼입 방지 검증', () => {
      // targetDepth 가 주어지면 go depth 20 명령어가 정상 생성되는지 검증
      expect(StockfishCommandBuilder.go({ targetDepth: 20 })).toBe('go depth 20');
      
      // nodes 가 주어지면 go nodes ... 명령어가 정상 생성되는지 검증
      expect(StockfishCommandBuilder.go({ nodes: 500000 })).toBe('go nodes 500000');

      // depth 보장 모드(targetDepth 또는 depth 제공 시)에서 nodes가 넘겨져도 nodes가 섞이지 않는지 검증
      const cmdDepthGuaranteed = StockfishCommandBuilder.go({ targetDepth: 20, nodes: 500000 });
      expect(cmdDepthGuaranteed).toBe('go depth 20');
      expect(cmdDepthGuaranteed).not.toContain('nodes');

      const cmdDepthGuaranteed2 = StockfishCommandBuilder.go({ depth: 15, nodes: 999990 });
      expect(cmdDepthGuaranteed2).toBe('go depth 15');
      expect(cmdDepthGuaranteed2).not.toContain('nodes');
    });
  });
});

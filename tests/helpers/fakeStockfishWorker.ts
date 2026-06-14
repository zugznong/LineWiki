import { vi } from 'vitest';

/**
 * Stockfish 어댑터 단위 테스트나 피드백 시뮬레이션에서 실제 WASM 엔진 없이
 * 다양한 설정(depth 24, 28, 32, infinite) 및 staircase 상태 연쇄 변천을 검증하기 위한 가상 워커 래퍼입니다.
 */
export class FakeStockfishWorker {
  public postMessage = vi.fn((command: string) => {
    this.handleCommand(command);
  });
  public terminate = vi.fn();
  public onmessage: ((e: { data: string }) => void) | null = null;
  public onerror: ((e: any) => void) | null = null;

  private activeMultiPv = 1;
  private currentDepth = 0;
  private maxTargetDepth = 20;
  private isGoInfinite = false;
  private limitMoves: string[] = [];

  constructor() {}

  /**
   * 가상 환경에서 어댑터에게 메시지를 방출합니다.
   */
  public emit(data: string) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  private handleCommand(command: string) {
    const trimmed = command.trim();

    if (trimmed === 'uci') {
      setTimeout(() => {
        this.emit('id name Stockfish 18 Fake');
        this.emit('uciok');
      }, 5);
    } else if (trimmed === 'isready') {
      setTimeout(() => {
        this.emit('readyok');
      }, 5);
    } else if (trimmed.startsWith('setoption name MultiPV value')) {
      const parts = trimmed.split(' ');
      this.activeMultiPv = parseInt(parts[parts.length - 1], 10) || 1;
    } else if (trimmed.startsWith('position fen')) {
      // fen 파싱 후 moves 수순 체크 등의 진단용
    } else if (trimmed.startsWith('go depth')) {
      const parts = trimmed.split(' ');
      const depth = parseInt(parts[parts.length - 1], 10) || 20;
      this.maxTargetDepth = depth;
      this.isGoInfinite = false;
      this.simulateSearch();
    } else if (trimmed === 'go infinite') {
      this.maxTargetDepth = 99;
      this.isGoInfinite = true;
      this.simulateSearch();
    } else if (trimmed === 'stop') {
      // 분석 중단 시 최종 베스트 무브 전송
      setTimeout(() => {
        this.emit('bestmove e2e4');
      }, 5);
    }
  }

  private simulateSearch() {
    this.currentDepth = 1;
    const interval = setInterval(() => {
      if (this.currentDepth > this.maxTargetDepth) {
        clearInterval(interval);
        if (!this.isGoInfinite) {
          this.emit('bestmove e2e4');
        }
        return;
      }

      // 지정된 MultiPV 수만큼 info depth 메시지 전송
      for (let pv = 1; pv <= this.activeMultiPv; pv++) {
        const score = 30 - pv * 5;
        const nodes = this.currentDepth * 50000;
        this.emit(`info depth ${this.currentDepth} multipv ${pv} score cp ${score} nodes ${nodes} nps 100000 time 500 pv e2e4`);
      }

      this.currentDepth++;
    }, 10);
  }
}

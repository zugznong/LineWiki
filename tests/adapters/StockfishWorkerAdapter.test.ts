import { describe, it, expect, vi, beforeEach } from 'vitest';

// 런타임 룬(rune) 스토어 의존성을 모킹하여 어댑터의 생애주기 로직만 노드 환경에서 검증합니다.
vi.mock('$lib/stores/localAnalysisStore.svelte.ts', () => ({
  localAnalysisStore: {
    status: 'idle',
    startAnalysis: vi.fn(),
    stopAnalysis: vi.fn(),
    setReady: vi.fn(),
    setError: vi.fn(),
    addEvaluationUpdate: vi.fn()
  }
}));

import { StockfishWorkerAdapter } from '../../src/lib/adapters/analysis/local/StockfishWorkerAdapter';

type FakeWorker = {
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  onmessage: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
};

function makeFakeWorker(): FakeWorker {
  return { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null };
}

function injectWorker(adapter: StockfishWorkerAdapter, worker: FakeWorker): void {
  (adapter as unknown as { worker: FakeWorker }).worker = worker;
}

function getWorker(adapter: StockfishWorkerAdapter): FakeWorker | null {
  return (adapter as unknown as { worker: FakeWorker | null }).worker;
}

const MOVE = { uci: 'e2e4', san: 'e4', resultingFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' };

describe('StockfishWorkerAdapter lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stop() without an existing worker does not throw or spawn one', () => {
    const adapter = new StockfishWorkerAdapter();
    expect(() => adapter.stop()).not.toThrow();
    expect(getWorker(adapter)).toBeNull();
  });

  it('start() then stop() sends quick-pass position/go then a stop command', () => {
    const adapter = new StockfishWorkerAdapter();
    const worker = makeFakeWorker();
    injectWorker(adapter, worker);

    adapter.start(MOVE.resultingFen, [MOVE]);
    const sent = worker.postMessage.mock.calls.map((c) => c[0] as string);
    expect(sent).toContain('stop');
    expect(sent).toContain(`position fen ${MOVE.resultingFen}`);
    expect(sent).toContain('go depth 3');
    expect(sent).not.toContain('go depth 10');

    worker.postMessage.mockClear();
    adapter.stop();
    expect(worker.postMessage).toHaveBeenCalledWith('stop');
  });

  it('dispose() terminates the worker and clears the reference', () => {
    const adapter = new StockfishWorkerAdapter();
    const worker = makeFakeWorker();
    injectWorker(adapter, worker);

    adapter.dispose();

    expect(worker.postMessage).toHaveBeenCalledWith('quit');
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(getWorker(adapter)).toBeNull();
  });

  it('repeated start() calls reuse the same worker instance (no duplicates)', () => {
    const adapter = new StockfishWorkerAdapter();
    const worker = makeFakeWorker();
    injectWorker(adapter, worker);

    adapter.start(MOVE.resultingFen, [MOVE]);
    const first = getWorker(adapter);
    adapter.start(MOVE.resultingFen, [MOVE]);
    const second = getWorker(adapter);

    expect(first).toBe(worker);
    expect(second).toBe(worker);
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it('does not emit move evaluations from late messages after stop()', () => {
    const adapter = new StockfishWorkerAdapter();
    const worker = makeFakeWorker();
    injectWorker(adapter, worker);
    const onResult = vi.fn();
    adapter.onResult(onResult);

    adapter.start(MOVE.resultingFen, [MOVE]);
    adapter.stop();
    onResult.mockClear();

    // 분석 중단 후 도착한 지연 info 라인은 활성 후보수가 없으므로 결과를 발생시키지 않아야 합니다.
    (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage(
      'info depth 8 multipv 1 score cp 30 nodes 100 nps 1000 time 50 pv e2e4 e7e5'
    );
    expect(onResult).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeStockfishWorker } from '../helpers/fakeStockfishWorker';

// 런타임 룬(rune) 스토어 의존성을 모킹하여 어댑터의 생애주기 로직만 노드 환경에서 검증합니다.
vi.mock('../../../stores/evaluationStore.svelte', () => {
  const store = {
    activeFen: '',
    generation: 0,
    beginPosition(fen: string, gen: number) {
      store.activeFen = fen;
      store.generation = gen;
    }
  };
  return { evaluationStore: store };
});

vi.mock('$lib/stores/localAnalysisStore.svelte.ts', () => {
  const { createLocalAnalysisStoreMock } = require('../helpers/localAnalysisStoreMock.ts');
  return { localAnalysisStore: createLocalAnalysisStoreMock() };
});

import { StockfishWorkerAdapter } from '../../src/lib/adapters/analysis/local/StockfishWorkerAdapter';
import { StockfishWorkerFactory } from '../../src/lib/adapters/analysis/local/StockfishWorkerFactory';
import { localAnalysisStore } from '../../src/lib/stores/localAnalysisStore.svelte.ts';
import { evaluationStore } from '../../src/lib/stores/evaluationStore.svelte';

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
  beforeEach(() => {
    vi.clearAllMocks();
    evaluationStore.beginPosition('', 0);
  });

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
    
    // 상태 머신을 통과시키기 위해 모의 응답 주입
    const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
    handleMsg('uciok');
    handleMsg('readyok');

    const sent = worker.postMessage.mock.calls.map((c) => c[0] as string);
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
    const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
    handleMsg('uciok');
    handleMsg('readyok');
    adapter.stop();
    onResult.mockClear();

    // 분석 중단 후 도착한 지연 info 라인은 활성 후보수가 없으므로 결과를 발생시키지 않아야 합니다.
    (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage(
      'info depth 8 multipv 1 score cp 30 nodes 100 nps 1000 time 50 pv e2e4 e7e5'
    );
    expect(onResult).not.toHaveBeenCalled();
  });

  it('does not emit bestmove from late messages after stop()', () => {
    const adapter = new StockfishWorkerAdapter();
    const worker = makeFakeWorker();
    injectWorker(adapter, worker);
    const onResult = vi.fn();
    adapter.onResult(onResult);

    adapter.start(MOVE.resultingFen, [MOVE]);
    const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
    handleMsg('uciok');
    handleMsg('readyok');
    adapter.stop();
    onResult.mockClear();

    // 분석 중단 후 도착한 지연 bestmove 라인 역시 결과를 야기해선 안 됩니다.
    (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage(
      'bestmove e2e4 ponder e7e5'
    );
    expect(onResult).not.toHaveBeenCalled();
  });

  it('does not emit any messages after dispose()', () => {
    const adapter = new StockfishWorkerAdapter();
    const worker = makeFakeWorker();
    injectWorker(adapter, worker);
    const onResult = vi.fn();
    adapter.onResult(onResult);

    adapter.start(MOVE.resultingFen, [MOVE]);
    const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
    handleMsg('uciok');
    handleMsg('readyok');
    adapter.dispose();
    onResult.mockClear();

    // 폐기 처분 후 동작하는 어떤 info 기별 혹은 bestmove 기별도 전혀 무시되어야 합니다.
    handleMsg('info depth 10 score cp 200');
    handleMsg('bestmove g1f3');

    expect(onResult).not.toHaveBeenCalled();
  });

  describe('회귀 테스트 - StockfishWorkerAdapter', () => {
    it('멀티스레드 지원 환경인 경우 MT 빌드 선택 검증', () => {
      // SharedArrayBuffer 및 crossOriginIsolated 가 구비된 환경 모사
      vi.stubGlobal('SharedArrayBuffer', class {});
      vi.stubGlobal('crossOriginIsolated', true);
      // Window 존재 여부 모의화
      vi.stubGlobal('window', {});

      const factorySpied = vi.spyOn(StockfishWorkerFactory, 'createWorker');
      
      const adapter = new StockfishWorkerAdapter();
      // start를 시도하여 내부 lazy worker 초기화를 트리거합니다.
      adapter.start(MOVE.resultingFen, [MOVE]);

      expect(factorySpied).toHaveBeenCalled();
      expect(localAnalysisStore.setEngineBuildType).toHaveBeenCalledWith('multi');
      expect(localAnalysisStore.engineBuildType).toBe('multi');
      
      // stub 정리
      vi.unstubAllGlobals();
      factorySpied.mockRestore();
    });

    it('멀티스레드 미지원 또는 지원 중 로드 실패 시 ST 전환 검증', () => {
      // SharedArrayBuffer 가 없는 미지원 환경
      vi.stubGlobal('SharedArrayBuffer', undefined);
      vi.stubGlobal('crossOriginIsolated', false);
      vi.stubGlobal('window', {});

      const factorySpied = vi.spyOn(StockfishWorkerFactory, 'createWorker');

      const adapter = new StockfishWorkerAdapter();
      adapter.start(MOVE.resultingFen, [MOVE]);

      expect(factorySpied).toHaveBeenCalled();
      
      // 첫 번째 콜백(onSingleThreadFallback)을 강제 호출
      const onSingleThreadFallback = factorySpied.mock.calls[0][0];
      onSingleThreadFallback('multi-runtime-failed');
      
      expect(localAnalysisStore.setEngineBuildType).toHaveBeenCalledWith('multi-failed-single-fallback');
      expect(localAnalysisStore.engineBuildType).toBe('multi-failed-single-fallback');

      vi.unstubAllGlobals();
      factorySpied.mockRestore();
    });

    it('readyok 파싱 이전/이후 ready 상태 변천 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      const onReadySpy = vi.fn();
      adapter.onReady(onReadySpy);

      adapter.start(MOVE.resultingFen, [MOVE]);

      // readyok를 수신하기 전에는 onReady 가 아직 실행되지 않아야 함
      expect(onReadySpy).not.toHaveBeenCalled();

      // readyok 메시지 수급
      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('readyok');

      // readyok 수신 후 onReady 기별이 정상 구동되어야 함
      expect(onReadySpy).toHaveBeenCalled();
    });

    it('초기화 단계에서 uciok가 오지 않는 경우 분석 시작 불가 및 실패 전이 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      const onResult = vi.fn();
      adapter.onResult(onResult);

      const onReady = vi.fn();
      adapter.onReady(onReady);

      adapter.start(MOVE.resultingFen, [MOVE]);

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg(`info depth 8 multipv 1 score cp 30 nodes 100 nps 1000 time 50 pv e2e4 e7e5`);

      expect(onResult).not.toHaveBeenCalled();
      expect(onReady).not.toHaveBeenCalled();
      expect(localAnalysisStore.startAnalysis).not.toHaveBeenCalled();
    });

    it('FEN 전환 후 구세대 기보 분석 메시지 폐기 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      const onResult = vi.fn();
      adapter.onResult(onResult);

      // 1. 초기 FEN 기동
      evaluationStore.beginPosition(MOVE.resultingFen, 1);
      adapter.start(MOVE.resultingFen, [MOVE]);

      // 2. 다른 FEN 으로 즉시 포지션 전환
      const nextFen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
      evaluationStore.beginPosition(nextFen, 2);
      adapter.start(nextFen, [MOVE]);

      onResult.mockClear();

      // 3. 구세대 FEN에 매칭되던 지연된 info 메시지가 도착함 (현재 FEN은 nextFen)
      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg(`info depth 8 multipv 1 score cp 30 nodes 100 nps 1000 time 50 pv e2e4 e7e5`);

      // 구세대 정보이므로 onResult가 호출되지 않고 수동 폐기되어야 함
      expect(onResult).not.toHaveBeenCalled();
    });

    it('실제 엔진 통신 타임아웃 또는 워커 에러 감지시 fallback 에러 상태 지정 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      
      // 강제 에러 메시지 주입
      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      
      // start를 시켜 isActive를 활성화시킴
      adapter.start(MOVE.resultingFen, [MOVE]);
      
      handleMsg('error: Local Web Worker process allocation blocked by CSP policies');

      // svelte 공용 스토어에 에러 지표가 성공적으로 갱신되어 전파되었는지 검증
      expect(localAnalysisStore.setError).toHaveBeenCalledWith('Local Web Worker process allocation blocked by CSP policies');
    });

    it('uciok·readyok가 정식으로 처리되기 전에는 position과 go 명령이 발송되지 않는지 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      adapter.start(MOVE.resultingFen, [MOVE]);

      // uciok와 readyok가 도착하기 이전에는 position/go 명령어가 전송되지 않고 보류되어야 함
      let sent = worker.postMessage.mock.calls.map((c) => c[0] as string);
      expect(sent).not.toContain(`position fen ${MOVE.resultingFen}`);
      expect(sent).not.toContain('go depth 3');

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);

      // uciok 도착
      handleMsg('uciok');
      sent = worker.postMessage.mock.calls.map((c) => c[0] as string);
      expect(sent).not.toContain(`position fen ${MOVE.resultingFen}`); // readyok가 더 필요함

      // readyok 도착
      handleMsg('readyok');
      sent = worker.postMessage.mock.calls.map((c) => c[0] as string);
      // readyok가 온 뒤에 비이지 상태로 전이되어 포지션과 go가 전송됨
      expect(sent).toContain(`position fen ${MOVE.resultingFen}`);
      expect(sent).toContain('go depth 3');
    });

    it('새 분석 기동 후 이전 세션의 지연된 info/bestmove 기별이 혼입되어 결과가 비매칭 오염되지 않는지 점검', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);
      const onResult = vi.fn();
      adapter.onResult(onResult);

      // 1. 첫 번째 분석 기동
      evaluationStore.beginPosition(MOVE.resultingFen, 1);
      adapter.start(MOVE.resultingFen, [MOVE]);
      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');
      handleMsg('readyok');

      const firstAnalysisId = adapter.currentAnalysisId;
      expect(firstAnalysisId).toBeDefined();

      // 2. 다른 분석 즉각 기동 (설정 변경 등의 시나리오 모사)
      adapter.stop();
      evaluationStore.beginPosition(MOVE.resultingFen, 2);
      adapter.start(MOVE.resultingFen, [MOVE]);
      const secondAnalysisId = adapter.currentAnalysisId;
      expect(secondAnalysisId).not.toBe(firstAnalysisId);

      onResult.mockClear();

      // readyok를 받아서 새 세션을 활성화합니다
      handleMsg('readyok');

      // 3. 지연 도착한 이전 세션의 info 메시지는 파싱되어 무시되거나 새 세션 ID로만 갱신되는 안전 보장 검증
      handleMsg(`info depth 8 multipv 1 score cp 30 nodes 100 nps 1000 time 50 pv e2e4 e7e5`);
      expect(onResult).toHaveBeenCalledTimes(1);
      const resultFrame = onResult.mock.calls[0][0];
      // 방출된 결과 기별은 오염 없이 새 분석 ID로 가짐
      expect(resultFrame.analysisId).toBe(secondAnalysisId);
      expect(resultFrame.analysisId).not.toBe(firstAnalysisId);
    });

    it('setoption Threads -> Hash -> MultiPV -> isready -> position -> go depth 20 순서 검증 및 go depth 12 하드코딩 실패 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      adapter.start({
        fen: MOVE.resultingFen,
        allCandidateMoves: [MOVE],
        targetMoves: [MOVE.uci],
        threads: 4,
        hash: 32,
        multiPv: 1,
        targetDepth: 20
      });

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');
      handleMsg('readyok');

      const sent = worker.postMessage.mock.calls.map((c) => c[0] as string);
      
      const idxThreads = sent.findIndex(c => c.includes('setoption name Threads value 4'));
      const idxHash = sent.findIndex(c => c.includes('setoption name Hash value 32'));
      const idxMultiPv = sent.findIndex(c => c.includes('setoption name MultiPV value 1'));
      const idxIsready = sent.findIndex(c => c === 'isready');
      const idxPosition = sent.findIndex(c => c.includes('position fen'));
      const idxGoDepth20 = sent.findIndex(c => c === 'go depth 20');

      expect(idxThreads).not.toBe(-1);
      expect(idxHash).not.toBe(-1);
      expect(idxMultiPv).not.toBe(-1);
      expect(idxIsready).not.toBe(-1);
      expect(idxPosition).not.toBe(-1);
      expect(idxGoDepth20).not.toBe(-1);

      expect(idxThreads).toBeLessThan(idxHash);
      expect(idxHash).toBeLessThan(idxMultiPv);
      expect(idxMultiPv).toBeLessThan(idxIsready);
      expect(idxIsready).toBeLessThan(idxPosition);
      expect(idxPosition).toBeLessThan(idxGoDepth20);

      const sendsGoDepth12 = sent.some(c => c === 'go depth 12');
      expect(sendsGoDepth12).toBe(false);
    });

    it('회귀 테스트 - PV 하나가 depth 20에 도달했지만 전체 MultiPV 프레임은 depth 19인 경우 softNodeCap이 부과되어도 stop 금지', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      const candidateMoves = [
        { uci: 'e2e4', san: 'e4' },
        { uci: 'd2d4', san: 'd4' }
      ];

      // 1. localAnalysisStore 및 adapter 분석 설정 (targetDepth=20, softNodeCap=1000000)
      localAnalysisStore.startAnalysis(candidateMoves, MOVE.resultingFen, 1, 20);
      adapter.start({
        fen: MOVE.resultingFen,
        allCandidateMoves: candidateMoves,
        targetMoves: ['e2e4', 'd2d4'],
        threads: 1,
        hash: 16,
        multiPv: 2,
        targetDepth: 20,
        softNodeCap: 1_000_000
      });

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');
      handleMsg('readyok');

      // worker 편향 전송 클리어 - start 및 초기화 절차 도중 발생했을 모든 명령어 리셋하여 baseline 격리
      worker.postMessage.mockClear();

      // 일부 PV가 depth 20에 도달하였으며 nodes는 softNodeCap(1_000_000)을 넘어섬
      // 그러나 다른 PV 정보('d2d4')는 아직 목표 깊이에 미달하므로 중단하지 않아야 합니다
      handleMsg('info depth 20 multipv 1 score cp 30 nodes 1200000 nps 100000 time 12000 pv e2e4');

      // completedFrameDepth이 준비되지 않았고 모든 targetMoves 완료가 충족되지 않았으므로 stop 명령어는 송신 보류되어야 함
      const stopCallsBefore = worker.postMessage.mock.calls.filter(c => c[0] === 'stop');
      expect(stopCallsBefore.length).toBe(0);

      // 이제 completedFrameDepth를 20으로 조립 완성
      localAnalysisStore.replaceEvaluationFrame([
        { moveUci: 'e2e4', score: 30, depth: 20 },
        { moveUci: 'd2d4', score: 20, depth: 20 }
      ]);
      expect(localAnalysisStore.completedFrameDepth).toBe(20);

      // depth 20 충족 이후 추가적인 info 메시지 접수 시 nodes 가 softNodeCap을 넘었으므로 stop이 발동해야 함
      handleMsg('info depth 20 multipv 1 score cp 30 nodes 1200000 nps 100000 time 12000 pv e2e4');
      const stopCallsAfter = worker.postMessage.mock.calls.filter(c => c[0] === 'stop');
      expect(stopCallsAfter.length).toBe(1);
    });

    it('회귀 테스트 - 분석 중 새 FEN 시작 시 stop을 보내고, bestmove가 수신될 때까지는 새로운 설정/분석을 보류한 뒤, bestmove 수신 후 비로서 새 시작', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);

      // 1. 첫 분석 가동
      evaluationStore.beginPosition(MOVE.resultingFen, 1);
      adapter.start(MOVE.resultingFen, [MOVE]);
      handleMsg('uciok');
      handleMsg('readyok');

      // 분석 중 상태가 되었는지 검증 (engineState = 'analyzing')
      expect((adapter as any).engineState).toBe('analyzing');

      worker.postMessage.mockClear();

      // 2. 분석 중인 상태에서 곧바로 다른 FEN으로 새로운 start 호출
      const NEW_FEN = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
      
      // 실제 브라우저와 똑같이 evaluationStore.activeFen 가 먼저 다음 FEN으로 업데이트된 상황을 모사합니다.
      evaluationStore.beginPosition(NEW_FEN, 2);

      adapter.start(NEW_FEN, [MOVE]);

      // [검증 1] stop은 보내며, 새 세션 요청은 queuedRestartRequest 에 안전히 대기해야 함
      expect(worker.postMessage).toHaveBeenCalledWith('stop');
      expect((adapter as any).queuedRestartRequest).not.toBeNull();
      expect((adapter as any).queuedRestartRequest.fen).toBe(NEW_FEN);

      // [검증 2] bestmove가 오기 전까지는 setoption, isready, position 등 신규 분석 관련 명령어 전송이 완전히 차단되어야 함
      worker.postMessage.mockClear();
      handleMsg('info depth 10 score cp 10 pv d2d4'); // 분석 중 지연 결과가 오더라도 
      expect(worker.postMessage).not.toHaveBeenCalled(); // 아무런 명령도 기동하지 않아야 함

      // [검증 3] 이제 드디어 bestmove가 수급되면, 그 즉시 queuedRestartRequest 를 대기열에서 꺼내서 정식 기동 및 uci settings / isready / go 수행해야 함
      handleMsg('bestmove d2d4');
      expect((adapter as any).queuedRestartRequest).toBeNull(); // 수용 완료

      const sent = worker.postMessage.mock.calls.map(c => c[0]);
      // state가 'readyok_received'에서 바로 applySettings/isReady 에 따라 setThreads, setHash, setMultiPv, isready를 보내야 함
      expect(sent).toContain('setoption name Threads value 1');
      expect(sent).toContain('isready');
    });

    it('회귀 테스트 - 분석 중 새 FEN 시작 -> stop 전송 -> 이전 bestmove 수신 -> pendingRequest 유지 -> 새 position/go 실행 흐름 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);

      // 1. 첫 분석 가동
      evaluationStore.beginPosition(MOVE.resultingFen, 1);
      adapter.start(MOVE.resultingFen, [MOVE]);
      handleMsg('uciok');
      handleMsg('readyok');

      // 분석 가동 확인
      expect((adapter as any).engineState).toBe('analyzing');
      worker.postMessage.mockClear();

      // 2. 분석 중 상태에서 다른 FEN으로 새 시작 호출
      const NEW_FEN = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
      
      // 실제 브라우저와 똑같이 evaluationStore.activeFen 가 먼저 다음 FEN으로 업데이트된 상황을 모사합니다.
      evaluationStore.beginPosition(NEW_FEN, 2);

      adapter.start(NEW_FEN, [MOVE]);

      // stop이 즉시 전송되어야 함
      expect(worker.postMessage).toHaveBeenCalledWith('stop');
      // 엔진 상태는 stopping-for-restart로 전이
      expect((adapter as any).engineState).toBe('stopping-for-restart');
      // 새 FEN 요청은 queuedRestartRequest 에 대기
      expect((adapter as any).queuedRestartRequest).not.toBeNull();
      expect((adapter as any).queuedRestartRequest.fen).toBe(NEW_FEN);

      worker.postMessage.mockClear();

      // 3. 지연 도착한 다른 메시지는 처리되거나 무시되고, 새 position-go 실행은 차단됨
      handleMsg('info depth 10 score cp 50 pv e2e4');
      expect(worker.postMessage).not.toHaveBeenCalled();

      // 4. 이전 세션의 bestmove 수신
      handleMsg('bestmove e2e4');

      // queuedRestartRequest 가 null 이 되고, 새로운 start() 가 실행됨
      expect((adapter as any).queuedRestartRequest).toBeNull();

      // 새 start() 가 수행되면서 settings/isready 가 전송됨
      const sentCommands = worker.postMessage.mock.calls.map(c => c[0]);
      expect(sentCommands).toContain('setoption name Threads value 1');
      expect(sentCommands).toContain('ucinewgame');
      expect(sentCommands).toContain('isready');

      // 5. readyok가 오면 새로운 FEN에 대한 position과 go가 최종 가동되어야 함
      worker.postMessage.mockClear();
      handleMsg('readyok');

      const sentCommandsAfterReady = worker.postMessage.mock.calls.map(c => c[0]);
      expect(sentCommandsAfterReady).toContain(`position fen ${NEW_FEN}`);
      expect(sentCommandsAfterReady).toContain('go depth 3');
      expect((adapter as any).engineState).toBe('analyzing');
    });

    it('회귀 테스트 - targetDepth 가 24인 세션에서 일부 PV만 depth 24에 도달하고 다른 PV는 미도달한 상태인 경우 completed로 전이되거나 엔진 stop이 발생하지 않고 analyzing을 안전하게 유지하는가 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const worker = makeFakeWorker();
      injectWorker(adapter, worker);

      const candidateMoves = [
        { uci: 'e2e4', san: 'e4' },
        { uci: 'd2d4', san: 'd4' }
      ];

      // 1. targetDepth=24로 기동
      localAnalysisStore.startAnalysis(candidateMoves, MOVE.resultingFen, 1, 24);
      adapter.start({
        fen: MOVE.resultingFen,
        allCandidateMoves: candidateMoves,
        targetMoves: ['e2e4', 'd2d4'],
        threads: 1,
        hash: 16,
        multiPv: 2,
        targetDepth: 24
      });

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');
      handleMsg('readyok');

      worker.postMessage.mockClear();

      // 2. e2e4 만 depth 24인 info 라인 수급
      handleMsg('info depth 24 multipv 1 score cp 30 nodes 500000 nps 100000 time 5000 pv e2e4');

      // 3. d2d4 는 아직 depth 23 인 상황으로 프레임 조립
      (localAnalysisStore as any).status = 'depth-progress';
      (localAnalysisStore as any).completedFrameDepth = 23;
      localAnalysisStore.replaceEvaluationFrame([
        { moveUci: 'e2e4', score: 30, depth: 24 },
        { moveUci: 'd2d4', score: 20, depth: 23 }
      ]);

      // 4. 이 단계에서 softNodeCap 등의 요인으로도 함부로 stop하지 않으며, status는 'completed' 가 아닌 'depth-progress'
      expect(localAnalysisStore.status).toBe('depth-progress');
      expect(localAnalysisStore.completedFrameDepth).toBe(23);

      const stopCalls = worker.postMessage.mock.calls.filter(c => c[0] === 'stop');
      expect(stopCalls.length).toBe(0); // 중단 명령 미발송
    });

    it('단위 테스트 - targetDepth 가 24, 28, 32 일 때 각각 정상 종료 및 목표 깊이 지정 작동 검증', () => {
      for (const depth of [24, 28, 32]) {
        const adapter = new StockfishWorkerAdapter();
        const fakeWorker = new FakeStockfishWorker() as any;
        injectWorker(adapter, fakeWorker);

        const candidateMoves = [{ uci: 'e2e4', san: 'e4' }];
        localAnalysisStore.startAnalysis(candidateMoves, MOVE.resultingFen, 1, depth);

        adapter.start({
          fen: MOVE.resultingFen,
          allCandidateMoves: candidateMoves,
          targetMoves: ['e2e4'],
          threads: 1,
          hash: 16,
          multiPv: 1,
          targetDepth: depth
        });

        // uciok/readyok 수급시켜 시뮬레이션 개시
        const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
        handleMsg('uciok');
        handleMsg('readyok');

        const sent = fakeWorker.postMessage.mock.calls.map((c: any) => c[0] as string);
        expect(sent).toContain(`go depth ${depth}`);
      }
    });

    it('단위 테스트 - 무제한(infinite) 분석 시 staircaseStep 상태 전이 검증 (stabilizing -> transitioning -> expanded)', () => {
      const adapter = new StockfishWorkerAdapter();
      const fakeWorker = new FakeStockfishWorker() as any;
      injectWorker(adapter, fakeWorker);

      const candidateMoves = [
        { uci: 'e2e4', san: 'e4' },
        { uci: 'd2d4', san: 'd4' },
        { uci: 'c2c4', san: 'c4' },
        { uci: 'g1f3', san: 'Nf3' }
      ];

      // infinite targetDepth=99 설정
      localAnalysisStore.startAnalysis(candidateMoves, MOVE.resultingFen, 1, 99);
      adapter.start({
        fen: MOVE.resultingFen,
        allCandidateMoves: candidateMoves,
        targetMoves: ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
        threads: 1, // 싱글스레드에서만 staircase 활성화
        hash: 16,
        multiPv: 4,
        targetDepth: 99,
        analysisMode: 'infinite'
      });

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');
      handleMsg('readyok');

      // (1) 1단계: MultiPV=3, TargetDepth=20 가동 중이어야 하므로 staircaseStep이 stabilizing임
      expect((adapter as any).isStaircaseActive).toBe(true);
      expect((adapter as any).staircaseStep).toBe('stabilizing');
      expect(localAnalysisStore.setStaircaseStep).toHaveBeenCalledWith('stabilizing');

      fakeWorker.postMessage.mockClear();

      // (2) depth 20 돌파 시그널 주입 -> stop() 전송 및 transitioning 단계 진입
      handleMsg('info depth 20 multipv 1 score cp 30 nodes 500000 nps 100000 time 500 pv e2e4');
      expect((adapter as any).staircaseStep).toBe('transitioning');
      expect(localAnalysisStore.setStaircaseStep).toHaveBeenCalledWith('transitioning');
      expect(fakeWorker.postMessage).toHaveBeenCalledWith('stop');

      // (3) bestmove 수신 -> expanded 진입 및 go infinite 전송
      fakeWorker.postMessage.mockClear();
      handleMsg('bestmove e2e4');
      expect((adapter as any).staircaseStep).toBe('expanded');
      expect(localAnalysisStore.setStaircaseStep).toHaveBeenCalledWith('expanded');

      // isready_sent 일 것이므로 readyok 신호를 주어 최종 go infinite 송신 유도
      handleMsg('readyok');
      const sentAfterReady = fakeWorker.postMessage.mock.calls.map((c: any) => c[0] as string);
      expect(sentAfterReady).toContain('go infinite');
    });

    it('멀티스레드 조건을 모사한 상태에서 budget이 infinite이고 threads가 2 이상이면 staircase 없이 go infinite가 전송되는지 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const fakeWorker = new FakeStockfishWorker() as any;
      injectWorker(adapter, fakeWorker);

      const candidateMoves = [
        { uci: 'e2e4', san: 'e4' },
        { uci: 'd2d4', san: 'd4' },
        { uci: 'c2c4', san: 'c4' },
        { uci: 'g1f3', san: 'Nf3' }
      ];

      adapter.start({
        fen: MOVE.resultingFen,
        allCandidateMoves: candidateMoves,
        targetMoves: ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
        threads: 2, // 2 thread, not single-thread
        hash: 16,
        multiPv: 4,
        targetDepth: 99,
        budget: 'infinite',
        analysisMode: 'infinite'
      });

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');
      handleMsg('readyok');

      // staircase가 미작동해야 함
      expect((adapter as any).isStaircaseActive).toBe(false);

      // position이 정상 전달된 상태에서 바로 go infinite가 가동되는지 확인
      const sent = fakeWorker.postMessage.mock.calls.map((c: any) => c[0] as string);
      expect(sent).toContain('go infinite');
    });

    it('싱글스레드 infinite에서 go depth 20 -> stop -> setoption MultiPV -> isready -> go infinite 순서로 순차 명령이 전송되는지 연쇄 검증', () => {
      const adapter = new StockfishWorkerAdapter();
      const fakeWorker = new FakeStockfishWorker() as any;
      injectWorker(adapter, fakeWorker);

      const candidateMoves = [
        { uci: 'e2e4', san: 'e4' },
        { uci: 'd2d4', san: 'd4' },
        { uci: 'c2c4', san: 'c4' },
        { uci: 'g1f3', san: 'Nf3' }
      ];

      adapter.start({
        fen: MOVE.resultingFen,
        allCandidateMoves: candidateMoves,
        targetMoves: ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
        threads: 1, // 싱글스레드
        hash: 16,
        multiPv: 4,
        targetDepth: 99,
        analysisMode: 'infinite'
      });

      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      
      // uciok 주입하여 Settings 적용 및 isready 송신 유도
      handleMsg('uciok');
      expect(fakeWorker.postMessage.mock.calls.map((c: any) => c[0])).toContain('isready');
      fakeWorker.postMessage.mockClear();

      // readyok 주입하여 1단계 stabilizing (go depth 20) 개시 유도
      handleMsg('readyok');
      
      let sentSoFar = fakeWorker.postMessage.mock.calls.map((c: any) => c[0]);
      // 1단계 stabilizing
      expect(sentSoFar).toContain('go depth 20');
      fakeWorker.postMessage.mockClear();

      // 2. depth 20 완성 (info depth 20) 수신하여 stop 송신 유도
      handleMsg('info depth 20 multipv 1 score cp 30 nodes 500000 nps 100000 time 500 pv e2e4');
      expect(fakeWorker.postMessage).toHaveBeenCalledWith('stop');
      fakeWorker.postMessage.mockClear();

      // 3. bestmove 수신하여 expanded(MultiPV 확장 및 isready) 유도
      handleMsg('bestmove e2e4');
      sentSoFar = fakeWorker.postMessage.mock.calls.map((c: any) => c[0]);
      expect(sentSoFar).toContain('setoption name MultiPV value 4');
      expect(sentSoFar).toContain('isready');
      fakeWorker.postMessage.mockClear();

      // 4. readyok 수신하여 2단계 expanded 가동 (go infinite) 개시 유도
      handleMsg('readyok');
      sentSoFar = fakeWorker.postMessage.mock.calls.map((c: any) => c[0]);
      expect(sentSoFar).toContain('go infinite');
    });

    it('회귀 테스트 - MT worker 가 생성 및 uci flush 된 상태에서 런타임 에러 발생 시, ST 워커로 교체되고 uci 재전송 및 uciok 정상 전이 검증', async () => {
      // 1. 멀티스레드 가용 보안 요건 설정
      vi.stubGlobal('SharedArrayBuffer', class {});
      vi.stubGlobal('crossOriginIsolated', true);
      vi.stubGlobal('window', {});
      
      // virtual browser worker mock 셋업
      const instances: any[] = [];
      class MockBrowserWorker {
        public onmessage: ((e: any) => void) | null = null;
        public onerror: ((e: any) => void) | null = null;
        public onmessageerror: ((e: any) => void) | null = null;
        public messagesSent: any[] = [];
        public isTerminated = false;
        public listeners: { type: string; listener: any }[] = [];

        constructor(public scriptPath: string) {
          instances.push(this);
        }

        postMessage(message: any, transfer?: any) {
          this.messagesSent.push(message);
        }

        terminate() {
          this.isTerminated = true;
        }

        addEventListener(type: string, listener: any) {
          this.listeners.push({ type, listener });
        }

        removeEventListener() {}
        dispatchEvent() { return false; }
      }

      vi.stubGlobal('Worker', MockBrowserWorker);

      // runPreflight()를 직접 함수 덮어쓰기로 모킹하여 바인딩 시에도 무조건 이행시킵니다.
      const originalPreflight = (StockfishWorkerFactory as any).runPreflight;
      (StockfishWorkerFactory as any).runPreflight = async () => {};

      const adapter = new StockfishWorkerAdapter();
      
      // 2. 분석 시작 시도하여 멀티스레드 워커 인스턴스화 (targetDepth 20으로 설정)
      adapter.start({
        fen: MOVE.resultingFen,
        allCandidateMoves: [MOVE],
        targetMoves: [MOVE.uci],
        threads: 4,
        hash: 32,
        multiPv: 1,
        targetDepth: 20
      });

      // Preflight 비동기 생명주기 완료를 위해 마이크로태스크를 양보합니다.
      await new Promise(resolve => setTimeout(resolve, 50));

      // first worker가 생성되었는지 검증
      expect(instances.length).toBe(1);
      const mtWorker = instances[0];
      
      // Mt worker에 uci 명령어가 전달되었는지 확인 (어댑터 기동 직후이므로)
      expect(mtWorker.messagesSent).toContain('uci');

      // 3. MT worker에 런타임 에러(error) 강제 주입하여 Fallback 시나리오 트리거
      const errEvent = typeof ErrorEvent !== 'undefined'
        ? new ErrorEvent('error', { message: 'WASM multi-thread SharedArrayBuffer error' })
        : ({ type: 'error', message: 'WASM multi-thread SharedArrayBuffer error', preventDefault() {} } as any);
      
      mtWorker.onerror!(errEvent);

      // ST 워커 Preflight 비동기 복구 대기를 위해 한 번 더 양보합니다.
      await new Promise(resolve => setTimeout(resolve, 50));

      // 4. Fallback 되어 두 번째 싱글스레드(ST) 워커가 생성되었는지 검증
      expect(instances.length).toBe(2);
      const stWorker = instances[1];
      expect(mtWorker.isTerminated).toBe(true);

      // ST 워커에 uci가 최소 전송되어 흘러갔는지 보증 확인 (보관 메시지 리플레이 + uci_sent 상태 추가 발송 덕분)
      expect(stWorker.messagesSent).toContain('uci');

      // 5. ST 워커에서 uciok 방출 시 어댑터가 uciok를 정상 처리하고 다음 변천으로 잘 이행되는지 파악
      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');
      
      // engineState가 uci_sent 에서 uciok_received 를 거쳐 기민하게 settings 전송 후 isready_sent 로 정상 천이가 이루어져 있어야 함
      expect((adapter as any).engineState).toBe('isready_sent');
      expect(stWorker.messagesSent).toContain('setoption name Threads value 1');
      expect(stWorker.messagesSent).toContain('isready');

      // 6. ST 워커에서 readyok 방출하여 position, go depth 20 전송 확인
      handleMsg('readyok');

      expect((adapter as any).engineState).toBe('analyzing');
      expect(stWorker.messagesSent).toContain(`position fen ${MOVE.resultingFen}`);
      expect(stWorker.messagesSent).toContain('go depth 20');

      // stub 및 spy 원복
      vi.unstubAllGlobals();
      (StockfishWorkerFactory as any).runPreflight = originalPreflight;
    });

    it('MT에서 deep, ultra, max, infinite budget 및 depth 20 초과 명령 및 Diagnostics 기록 검증', () => {
      const budgets = [
        { budget: 'deep', targetDepth: 24, expectedGo: 'go depth 24', analysisMode: 'depth' },
        { budget: 'ultra', targetDepth: 28, expectedGo: 'go depth 28', analysisMode: 'depth' },
        { budget: 'max', targetDepth: 32, expectedGo: 'go depth 32', analysisMode: 'depth' },
        { budget: 'infinite', targetDepth: 99, expectedGo: 'go infinite', analysisMode: 'infinite' }
      ];

      for (const b of budgets) {
        const adapter = new StockfishWorkerAdapter();
        const fakeWorker = new FakeStockfishWorker() as any;
        injectWorker(adapter, fakeWorker);

        // MT 모사 (threads=2)
        fakeWorker.buildType = 'multi';

        const candidateMoves = [MOVE];
        const req: any = {
          fen: MOVE.resultingFen,
          allCandidateMoves: candidateMoves,
          targetMoves: [MOVE.uci],
          threads: 2,
          hash: 16,
          multiPv: 1,
          budget: b.budget,
          targetDepth: b.targetDepth,
          analysisMode: b.analysisMode
        };

        // 분석 시작 기동
        adapter.start(req);

        // uciok/readyok 수급시켜 시뮬레이션 개시
        const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
        handleMsg('uciok');
        handleMsg('readyok');

        // 기대하는 go command가 전송되었는지 확인
        const sent = fakeWorker.postMessage.mock.calls.map((c: any) => c[0] as string);
        const lastSent = sent[sent.length - 1];
        expect(lastSent).toContain(b.expectedGo);

        // window.__stockfish_diagnostics__ 전역 진단값 검증
        if (typeof window !== 'undefined') {
          const diag = (window as any).__stockfish_diagnostics__;
          expect(diag).toBeDefined();
          expect(diag.actualBuildType).toBe('multi');
          expect(diag.requestedThreads).toBe(2);
          expect(diag.actualThreads).toBe(2);
          expect(diag.budget).toBe(b.budget);
          expect(diag.targetDepth).toBe(b.targetDepth);
          expect(diag.lastGoCommand).toContain(b.expectedGo);
        }
        
        adapter.dispose();
      }
    });

    it('customDepth가 40 및 60으로 부여되었을 때 각각 go depth 40 및 go depth 60 이 올바르게 수색 전송되는지 검증', () => {
      for (const customDepth of [40, 60]) {
        const adapter = new StockfishWorkerAdapter();
        const fakeWorker = new FakeStockfishWorker() as any;
        injectWorker(adapter, fakeWorker);

        const candidateMoves = [MOVE];
        adapter.start({
          fen: MOVE.resultingFen,
          allCandidateMoves: candidateMoves,
          targetMoves: [MOVE.uci],
          threads: 2,
          hash: 16,
          multiPv: 1,
          budget: 'custom',
          customDepth: customDepth,
          targetDepth: customDepth
        });

        const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
        handleMsg('uciok');
        handleMsg('readyok');

        const sent = fakeWorker.postMessage.mock.calls.map((c: any) => c[0] as string);
        const lastSent = sent[sent.length - 1];
        expect(lastSent).toBe(`go depth ${customDepth}`);

        // window.__stockfish_diagnostics__ 검사
        if (typeof window !== 'undefined') {
          const diag = (window as any).__stockfish_diagnostics__;
          expect(diag).toBeDefined();
          expect(diag.lastGoCommand).toBe(`go depth ${customDepth}`);
        }

        adapter.dispose();
      }
    });

    it('회귀 테스트 - MT 오류 시 ST fallback 직후 pendingRequest = lastRequest, engineState = uci_sent, send(uci)가 전사 실행되고, uciok 수신 시 applySettingsAndIsReady 가 연쇄 가동되는지 검증', async () => {
      // 1. 가상 환경 구축
      vi.stubGlobal('SharedArrayBuffer', class {});
      vi.stubGlobal('crossOriginIsolated', true);
      vi.stubGlobal('window', {});

      const instances: any[] = [];
      class MockBrowserWorker {
        public onmessage: ((e: any) => void) | null = null;
        public onerror: ((e: any) => void) | null = null;
        public messagesSent: any[] = [];
        public isTerminated = false;

        constructor(public scriptPath: string) {
          instances.push(this);
        }

        postMessage(message: any) {
          this.messagesSent.push(message);
        }

        terminate() {
          this.isTerminated = true;
        }

        addEventListener() {}
        removeEventListener() {}
      }

      vi.stubGlobal('Worker', MockBrowserWorker);

      const originalPreflight = (StockfishWorkerFactory as any).runPreflight;
      (StockfishWorkerFactory as any).runPreflight = async () => {};

      const adapter = new StockfishWorkerAdapter();
      
      const testRequest = {
        fen: MOVE.resultingFen,
        allCandidateMoves: [MOVE],
        targetMoves: [MOVE.uci],
        threads: 4,
        hash: 32,
        multiPv: 1,
        targetDepth: 20
      };

      // 2. 분석 기동
      adapter.start(testRequest);
      await new Promise(resolve => setTimeout(resolve, 20));

      // 생성된 MT 워커에 uci가 기송출되었는지 검사
      expect(instances.length).toBe(1);
      const mtWorker = instances[0];
      expect(mtWorker.messagesSent).toContain('uci');

      // uci 명령어 수신 기록 초기화하여 fallback 시 uci 재송신만 세밀히 추적
      mtWorker.messagesSent = [];

      // 3. MT 워커에서 에러 발생 시그널 주입 (onFallbackToSingle 트리거)
      mtWorker.onerror!({ message: 'SharedArrayBuffer lock crash' } as any);
      await new Promise(resolve => setTimeout(resolve, 20));

      // ST 워커가 새로이 부팅되었음을 확인
      expect(instances.length).toBe(2);
      const stWorker = instances[1];

      // 핵심 체크 1 & 2: ST fallback 직후 pendingRequest = lastRequest 여야 함
      expect((adapter as any).pendingRequest).toBe(testRequest);
      expect((adapter as any).lastRequest).toBe(testRequest);

      // 핵심 체크 3 & 4: engineState = 'uci_sent' 이고 새 ST 워커에 'uci' 를 명시적으로 전사 재송신했어야 함
      expect((adapter as any).engineState).toBe('uci_sent');
      expect(stWorker.messagesSent).toContain('uci');

      // ST 워커의 송출 메시지 버퍼 초기화
      stWorker.messagesSent = [];

      // 핵심체크 5: uciok 수신 시 applySettingsAndIsReady()가 호출되어 settings 및 isready 가 정상 연동되어야 함
      const handleMsg = (adapter as unknown as { handleWorkerMessage: (m: string) => void }).handleWorkerMessage.bind(adapter);
      handleMsg('uciok');

      expect((adapter as any).engineState).toBe('isready_sent');
      expect(stWorker.messagesSent).toContain('setoption name Threads value 1'); // ST는 강제로 Threads 1
      expect(stWorker.messagesSent).toContain('setoption name Hash value 32');
      expect(stWorker.messagesSent).toContain('setoption name MultiPV value 1');
      expect(stWorker.messagesSent).toContain('isready');

      // 원복
      vi.unstubAllGlobals();
      (StockfishWorkerFactory as any).runPreflight = originalPreflight;
      adapter.dispose();
    });
  });
});


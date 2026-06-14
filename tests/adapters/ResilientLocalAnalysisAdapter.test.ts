import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. 공용 스토어 및 리소스 가상화 모킹 선언
vi.mock('$lib/config/runtimeConfig', () => {
  return {
    isBrowser: true,
    isDevelopment: false,
    isCloudflarePages: false,
    STOCKFISH_STATIC_DIR: '/stockfish',
    STOCKFISH_MULTI_JS_PATH: '/stockfish/stockfish-18-lite.js',
    STOCKFISH_MULTI_WASM_PATH: '/stockfish/stockfish-18-lite.wasm',
    STOCKFISH_SINGLE_JS_PATH: '/stockfish/stockfish-18-lite-single.js',
    STOCKFISH_SINGLE_WASM_PATH: '/stockfish/stockfish-18-lite-single.wasm',
    ENABLE_HEURISTIC_FALLBACK_EVALUATIONS: false
  };
});

vi.mock('$lib/stores/localAnalysisStore.svelte.ts', () => {
  const { createLocalAnalysisStoreMock } = require('../helpers/localAnalysisStoreMock.ts');
  return { localAnalysisStore: createLocalAnalysisStoreMock() };
});

vi.mock('../../../stores/evaluationStore.svelte', () => ({
  evaluationStore: {
    setSourceStatus: vi.fn()
  }
}));

import { ResilientLocalAnalysisAdapter } from '../../src/lib/adapters/analysis/local/ResilientLocalAnalysisAdapter';
import { localAnalysisStore } from '../../src/lib/stores/localAnalysisStore.svelte.ts';
import { EvalScore } from '../../src/lib/domain/analysis/EvalScore';

// 1.5 비동기 지터 방지용 Polling Wait Helper 선언
async function waitForCondition(condition: () => boolean, timeoutMs: number = 300): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return false;
}

// 2. 가상 Web Worker 클래스 설계 (Heuristic Fallback 제어용)
class SimpleMockWorker {
  public onmessage: ((e: any) => void) | null = null;
  public onerror: ((e: any) => void) | null = null;
  private activeMoveUci = '';

  constructor(public url: string, public options?: any) {
    // 셰이크핸드 부트 업 알림 발송용 비동기 스레드 모방
    setTimeout(() => {
      this.onmessage?.({ data: 'fallback-worker-ready' });
    }, 5);
  }

  postMessage(msg: string) {
    if (msg === 'uci') {
      setTimeout(() => {
        this.onmessage?.({ data: 'uciok' });
      }, 5);
    } else if (msg === 'isready') {
      setTimeout(() => {
        this.onmessage?.({ data: 'readyok' });
      }, 5);
    } else if (msg.startsWith('setoption name LineWikiRootMove value ')) {
      this.activeMoveUci = msg.replace('setoption name LineWikiRootMove value ', '').trim();
    } else if (msg.startsWith('position fen')) {
      // 분석 포지션 수신
    } else if (msg.startsWith('go depth 10')) {
      // depth 10 도달 시 유의미한 가상 info 및 bestmove 송신하며 기보 계산 종언 유도
      setTimeout(() => {
        const moveUci = this.activeMoveUci || 'd2d4';
        // 백 입장에서 흑이 유리할 때 흑의 입장에서 +cp 150 (White Perspective로 들어갈 경우 결과에 따라 마이너스 적용)
        // 실제 fallback 파서 조건과 동일하게 pv d2d4 형식의 pv 요소를 제공해 rootMoveUci 및 기보 매핑 정확도 수립
        this.onmessage?.({ data: `info depth 10 score cp 150 nodes 1234 pv ${moveUci}` });
        this.onmessage?.({ data: `bestmove ${moveUci}` });
      }, 10);
    }
  }

  terminate() {}
}

const MOCK_CANDIDATE_MOVES = [
  {
    uci: 'e2e4',
    san: 'e4',
    resultingFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' // 백의 e4, 다음 차례는 b(Black)
  },
  {
    uci: 'd2d4',
    san: 'd4',
    resultingFen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1' // 백의 d4, 다음 차례는 b(Black)
  }
];

describe('ResilientLocalAnalysisAdapter 회복 및 격상 정밀 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 청소
    (localAnalysisStore as any).status = 'idle';
    for (const key in localAnalysisStore.evaluations) {
      delete localAnalysisStore.evaluations[key];
    }
    
    // 글로벌 윈도우 및 워커 바인딩으로 isBrowser 우회 활성화 보조
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', SimpleMockWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('일부 완수된 평가가 보존된 상태에서 주 어댑터가 기각 시, 미해결 수만 fallback 큐에 인계되는지 장악 보장 검증', async () => {
    // 1. e2e4 는 이미 자격 충분한 수준(depth: 10)으로 완료되어 스토어에 보전되어 있는 것으로 설정
    localAnalysisStore.evaluations['e2e4'] = {
      moveSan: 'e4',
      moveUci: 'e2e4',
      depth: 10,
      score: new EvalScore('cp', 15),
      source: 'local'
    };

    // d2d4 는 아직 수렴하지 못했거나 depth가 턱없이 부족(depth: 4)하여 해결되지 않은 무브로 소포 장치됨
    localAnalysisStore.evaluations['d2d4'] = {
      moveSan: 'd4',
      moveUci: 'd2d4',
      depth: 4,
      score: new EvalScore('cp', 10),
      source: 'local'
    };

    const adapter = new ResilientLocalAnalysisAdapter();

    // 2. 어댑터 구동 및 시작
    adapter.start('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', MOCK_CANDIDATE_MOVES);

    // 3. 주 어댑터 오작동 이벤트 강제 유발 (onFailure 콜백 소집을 가상 호출하여 위용 격상 연출)
    const primaryFailureTrigger = (adapter as any).stockfishAdapter.onFailureCallback;
    expect(primaryFailureTrigger).toBeDefined();

    // 강제 격상!
    primaryFailureTrigger();

    // 4. 격상 성공 후 미해결 리스트 자격 추밀 검사
    // - e2e4(depth 10) 는 완수로 분류되어 제외됨
    // - d2d4(depth 4) 만 unresolved 로 분류되어 fallbackQueue 진입 대상이 됨
    const fallbackQueue = (adapter as any).fallbackQueue;
    expect(fallbackQueue.length).toBe(1);
    expect(fallbackQueue[0].uci).toBe('d2d4');
    expect(localAnalysisStore.setEngineBuildType).toHaveBeenCalledWith('fallback');
    expect((localAnalysisStore as any).engineBuildType).toBe('fallback');

    // 5. 비동기 대체 워커 메시지 전이 및 응답 가동 시간 보조 지연 대기 (polling 대기로 교체)
    await waitForCondition(() => localAnalysisStore.evaluations['d2d4']?.depth === 10, 300);

    // 6. 결과 보존 및 복조 체크
    // - d2d4 에 대한 가치 수치가 대체 가동 결과('fallback')로 업데이트 완료되었는지 단언
    const d2d4Eval = localAnalysisStore.evaluations['d2d4'];
    expect(d2d4Eval).toBeDefined();
    expect(d2d4Eval.depth).toBe(10);
    expect(d2d4Eval.source).toBe('fallback');
  });

  it('대체 엔진 수색 시 결과 점수 부호 환치가 단순 개시 FEN이 아닌 무브별 resulting FEN 차례를 기준으로 정확히 계산(White Perspective)되는지 검증', async () => {
    // start fens w (White) 이나 흑의 턴을 분간
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // 백의 턴 (w)
    
    // d2d4 가 주는 결과 FEN: 백이 턴을 두었으므로 흑의 차례(b)가 됨.
    // 흑의 차례 FEN에서 cp점수 150 (정보 수치로써 흑이 우위에 있는 상황) 이 출력되었을 때, 
    // White Perspective 환산에 투영되면 흑의 시점 점수(150)의 부호가 백 기준(-150)으로 반전되어야 함.
    // 만약 targetFen 을 기보 FEN(resultingFen, 다음 차례 b)이 아닌 시작 FEN(w)으로 기재할 경우 변동 없이 +150으로 통과하는 치명적 실책이 유도됨.

    const adapter = new ResilientLocalAnalysisAdapter();
    adapter.start(startFen, MOCK_CANDIDATE_MOVES);

    // onResult 기별 감청 바인딩
    const onResultSpy = vi.fn();
    adapter.onResult(onResultSpy);

    // 강제 격상 트리거
    const primaryFailureTrigger = (adapter as any).stockfishAdapter.onFailureCallback;
    primaryFailureTrigger();

    // 비동기 통신 가상 대기 (polling 대기로 교체)
    await waitForCondition(() => onResultSpy.mock.calls.some(call => call[0].bestMoveUci === 'd2d4'), 300);

    // result 콜백을 수급하여 score 가 최종 반전되었는지 대조
    expect(onResultSpy).toHaveBeenCalled();
    const lastResultUpdate = onResultSpy.mock.calls.find(call => call[0].bestMoveUci === 'd2d4');
    expect(lastResultUpdate).toBeDefined();

    if (!lastResultUpdate) {
      throw new Error('lastResultUpdate is undefined');
    }

    const finalizedResult = lastResultUpdate[0];
    // source가 fallback 임을 증빙
    expect(finalizedResult.source).toBe('fallback');
    // resultingFen(b 차례) 기준으로 흑이 우위에 있던 점수의 부호를 백 중심(-150)으로 정교하게 변조 완성한 것을 증명
    expect(finalizedResult.score.value).toBe(-150);

    // 자원 전역 폐기환
    adapter.dispose();
  });

  it('Stockfish 실패 + fallback 비표시 설정 시 평가 차단 및 analysis-unavailable 상태 돌입 검증', async () => {
    const adapter = new ResilientLocalAnalysisAdapter();
    
    // fallback 비표시 설정 강제 주입
    adapter.setShowFallbackEvaluation(false);

    // 구동 및 시작
    adapter.start('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', MOCK_CANDIDATE_MOVES);

    // 주 어댑터 오작동 이벤트 강제 유발 (OnFailure)
    const primaryFailureTrigger = (adapter as any).stockfishAdapter.onFailureCallback;
    primaryFailureTrigger();

    // 비동기 대체 워커 대기
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(localAnalysisStore.status).toBe('analysis-unavailable');
    expect(localAnalysisStore.evaluations['d2d4']).toBeUndefined();
    expect(localAnalysisStore.evaluations['e2e4']).toBeUndefined();

    // cleanup
    adapter.dispose();
  });

  it('Stockfish 실패 + fallback 표시 설정 온오프 테스트 (표시 설정을 켜면 fallback 평가 생성)', async () => {
    const adapter = new ResilientLocalAnalysisAdapter();
    
    // fallback 표시 활성화 강제 설정
    adapter.setShowFallbackEvaluation(true);

    // 구동 및 시작
    adapter.start('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', MOCK_CANDIDATE_MOVES);

    // 실패 유발
    const primaryFailureTrigger = (adapter as any).stockfishAdapter.onFailureCallback;
    primaryFailureTrigger();

    // 비동기 대기 (polling 대기로 교체)
    await waitForCondition(() => localAnalysisStore.evaluations['d2d4'] !== undefined, 300);

    // 이번에는 표시 설정이 정상 적용되어 fallback 평가치가 계산되어 적립되며 완료 상태 패스함
    expect(['fallback-running', 'fallback-completed']).toContain(localAnalysisStore.status);
    expect(localAnalysisStore.evaluations['d2d4']).toBeDefined();
    expect(localAnalysisStore.evaluations['d2d4'].source).toBe('fallback');

    // cleanup
    adapter.dispose();
  });

  it('Fallback Worker에서 에러 발생 시(error 및 unhandledrejection 시나리오), 스토어에 에러 원인과 fallback-failed 상태가 완연히 기록되는지 검증', async () => {
    const adapter = new ResilientLocalAnalysisAdapter();
    adapter.setShowFallbackEvaluation(true);
    adapter.start('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', MOCK_CANDIDATE_MOVES);

    // 1. 주 어댑터 실패 유도
    const primaryFailureTrigger = (adapter as any).stockfishAdapter.onFailureCallback;
    primaryFailureTrigger();

    // 2. 가상 대체 워커 수급
    const mockWorker = (adapter as any).fallbackWorker;
    expect(mockWorker).toBeDefined();

    // 3. 대체 워커 onerror 핸들러에 mock 에러이벤트 전사발송
    const testErrorEvent = { message: 'Worker evaluation constraint crash', filename: 'fallback.js', lineno: 42 };
    mockWorker.onerror?.(testErrorEvent);

    // 4. 스토어 상태 및 fallback-failed 확정 여부 확인
    expect(localAnalysisStore.status).toBe('fallback-failed');
    expect(localAnalysisStore.lastEngineError).toContain('Worker evaluation constraint crash');

    adapter.dispose();
  });

  it('Stockfish 실패 후 fallback 비표시 모드에서 모든 미해결 후보수가 analysis-unavailable 상태를 굳건히 보존하고, 지연 수집된 주엔진의 bestmove/info/readyok 결함 데이터가 유입되더라도 다시 수색 기동되지 않고 상태가 유지되는지 검증', async () => {
    const adapter = new ResilientLocalAnalysisAdapter();
    adapter.setShowFallbackEvaluation(false);

    // 1. 구동 및 전방 가동
    adapter.start('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', MOCK_CANDIDATE_MOVES);

    // 2. 주 어댑터 오작동 강제 트리거
    const primaryFailureTrigger = (adapter as any).stockfishAdapter.onFailureCallback;
    primaryFailureTrigger();

    // 3. 대체 분석 차단에 따라 비활성 및 불가(`analysis-unavailable`) 상태로 이행되었음을 확정
    expect(localAnalysisStore.status).toBe('analysis-unavailable');

    // 4. 이 상태에서 지연된 주어댑터 결과 수신부(onResult, onReady)에 임의의 정상 메시지들이 혼입됨
    const resultCallback = (adapter as any).stockfishAdapter.onResultCallback;
    const readyCallback = (adapter as any).stockfishAdapter.onReadyCallback;

    expect(resultCallback).toBeDefined();
    expect(readyCallback).toBeDefined();

    // 지연 주엔진 응답 발송 시도
    readyCallback?.();
    resultCallback?.({ type: 'bestmove', bestmove: 'e2e4' });
    resultCallback?.({ type: 'info', depth: 15, score: { type: 'cp', value: 30 } });

    // 5. 검사 - 여전히 지연된 기별에 영향 받지 않고 'analysis-unavailable' 상태를 한 번의 동요 없이 부동으로 지속해야 함
    expect(localAnalysisStore.status).toBe('analysis-unavailable');

    // cleanup
    adapter.dispose();
  });

  it('onFailure 발생 시, setStatus("stockfish-failed") 및 switchToFallback 내부 setStatus("analysis-unavailable")가 정확한 흐름으로 순차 호출되는지 스파이로 검증', async () => {
    const adapter = new ResilientLocalAnalysisAdapter();
    adapter.setShowFallbackEvaluation(false);

    // 1. 구동 시작
    adapter.start('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', MOCK_CANDIDATE_MOVES);

    // 스파이 호출 기록 리셋
    vi.mocked(localAnalysisStore.setStatus).mockClear();

    // 2. 주 어댑터 오작동 강제 트리거
    const primaryFailureTrigger = (adapter as any).stockfishAdapter.onFailureCallback;
    primaryFailureTrigger();

    // 3. 호출 순서 단언 (setStatus는 stockfish-failed가 먼저 호출되고, 그 다음 switchToFallback 내부에서 analysis-unavailable이 호출되어야 함)
    const calls = vi.mocked(localAnalysisStore.setStatus).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
    
    // 첫 세팅은 stockfish-failed 여야 함
    expect(calls[0][0]).toBe('stockfish-failed');
    
    // 그 다음 세팅은 fallback 비표시 설정인 경우 switchToFallback에 의해 analysis-unavailable 여야 함
    expect(calls[1][0]).toBe('analysis-unavailable');
    
    adapter.dispose();
  });
});

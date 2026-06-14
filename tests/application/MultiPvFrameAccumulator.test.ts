import { describe, it, expect } from 'vitest';
import { MultiPvFrameAccumulator } from '../../src/lib/application/analysis/MultiPvFrameAccumulator';
import { LocalAnalysisResult } from '../../src/lib/domain/analysis/LocalAnalysisResult';
import { EvalScore } from '../../src/lib/domain/analysis/EvalScore';
import { PrincipalVariation } from '../../src/lib/domain/analysis/PrincipalVariation';
import { localAnalysisStore } from '../../src/lib/stores/localAnalysisStore.svelte.ts';

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function createMockResult(depth: number, uci: string, multiPvIndex: number): LocalAnalysisResult {
  return new LocalAnalysisResult(
    FEN,
    depth,
    new EvalScore('cp', 10),
    new PrincipalVariation([uci]),
    uci,
    null,
    'completed',
    1000,
    100,
    multiPvIndex
  );
}

describe('MultiPvFrameAccumulator Tests', () => {
  it('서로 다른 순서로 도착한 MultiPV 결과가 동일 depth 프레임에 모여 정상 완성되는지 검증', () => {
    // 2개의 수군을 타겟팅
    const accumulator = new MultiPvFrameAccumulator(2);

    // 1. depth 10, index 2 가 먼저 도착 (순서 뒤바뀜)
    const res2 = createMockResult(10, 'd2d4', 2);
    const frame1 = accumulator.addResult(res2);
    expect(frame1).toBeNull(); // 아직 1개 누락되어 미포함

    // 2. depth 10, index 1 이 도착
    const res1 = createMockResult(10, 'e2e4', 1);
    const frame2 = accumulator.addResult(res1);

    expect(frame2).not.toBeNull();
    expect(frame2?.length).toBe(2);
    // e2e4와 d2d4가 모두 포함되어 있어야 함
    const ucis = frame2?.map(r => r.bestMoveUci);
    expect(ucis).toContain('e2e4');
    expect(ucis).toContain('d2d4');
  });

  it('불완전한 높은 depth의 새 프레임이 이미 완전히 구성된 기존의 완성 프레임을 덮어쓰지 않는지 검증', () => {
    const accumulator = new MultiPvFrameAccumulator(2);

    // Depth 10 프레임 완성
    accumulator.addResult(createMockResult(10, 'e2e4', 1));
    accumulator.addResult(createMockResult(10, 'd2d4', 2));

    // Depth 11 프레임은 index 1만 도착하여 불완전함
    accumulator.addResult(createMockResult(11, 'g1f3', 1));

    // 최종 결과물 획득
    const bestFrame = accumulator.getFinalBestFrame();

    // 불완전한 Depth 11이 아니라, 완벽하게 기보 수집을 마친 Depth 10 프레임(2개 요소)이 그대로 유지되어야 함
    expect(bestFrame.length).toBe(2);
    expect(bestFrame[0].depth).toBe(10);
  });

  it('분석 중단 시 지금까지 모은 최선의 완성형 프레임이 완벽히 복원 보존되는지 검증', () => {
    const accumulator = new MultiPvFrameAccumulator(2);

    // 완벽한 depth 8 완성
    accumulator.addResult(createMockResult(8, 'e2e4', 1));
    accumulator.addResult(createMockResult(8, 'd2d4', 2));

    // 미처 다 완성되지 못한 depth 9 단계 (index 1 만 기록)
    accumulator.addResult(createMockResult(9, 'e2e4', 1));

    // 분석을 멈췄을 때 최종 제공되는 최선의 프레임은 무위화되지 않고 depth 8 완성본이어야 함
    const stoppedFrame = accumulator.getFinalBestFrame();
    expect(stoppedFrame.length).toBe(2);
    expect(stoppedFrame.every(r => r.depth === 8)).toBe(true);
  });

  it('높은 depth 12 완성 후 낮은 depth 10 완성 기별이 늦게 도착해도 최선 프레임이 퇴화되지 않고 무시되는지 검증', () => {
    const accumulator = new MultiPvFrameAccumulator(2);

    // 1. depth 12 완성
    accumulator.addResult(createMockResult(12, 'e2e4', 1));
    const final12 = accumulator.addResult(createMockResult(12, 'd2d4', 2));
    expect(final12).not.toBeNull();
    expect(final12?.every(r => r.depth === 12)).toBe(true);

    // 2. 뒤늦게 늦둥이로 날아온 depth 10 완성 시도
    accumulator.addResult(createMockResult(10, 'e2e4', 1));
    const final10 = accumulator.addResult(createMockResult(10, 'd2d4', 2));

    // 이 결과는 최선 깊이(12)보다 낮으므로 addResult 단계에서 완성 프레임으로 리턴되지 않고 null이 되어야 함
    expect(final10).toBeNull();

    // 최종 getFinalBestFrame() 획득 시에도 여전히 depth 12가 유지되고 복원되어야 함
    const resolvedFrame = accumulator.getFinalBestFrame();
    expect(resolvedFrame.length).toBe(2);
    expect(resolvedFrame.every(r => r.depth === 12)).toBe(true);
  });

  it('순서에 무관하게 완성된 프레임이 항상 multiPvIndex 1...N 순서대로 정렬되어 반환되는지 보장', () => {
    const accumulator = new MultiPvFrameAccumulator(3);

    // 섞여서 입력되는 1...3 랭킹 후보수들
    accumulator.addResult(createMockResult(10, 'g1f3', 3));
    accumulator.addResult(createMockResult(10, 'e2e4', 1));
    const completed = accumulator.addResult(createMockResult(10, 'd2d4', 2));

    expect(completed).not.toBeNull();
    expect(completed?.length).toBe(3);
    
    // index가 1, 2, 3 순으로 질서 있게 오름차순 보존되었는지 검증
    expect(completed![0].multiPvIndex).toBe(1);
    expect(completed![1].multiPvIndex).toBe(2);
    expect(completed![2].multiPvIndex).toBe(3);
    expect(completed![0].bestMoveUci).toBe('e2e4');
    expect(completed![1].bestMoveUci).toBe('d2d4');
    expect(completed![2].bestMoveUci).toBe('g1f3');
  });

  it('최신 depth 완성 시 임계선 미만의 오래된 depth에 해당하는 맵 찌꺼기들이 말끔히 청소되는지 검증', () => {
    const accumulator = new MultiPvFrameAccumulator(2);

    // depth 8 데이터 투척 (미완성으로 남겨둠)
    accumulator.addResult(createMockResult(8, 'e2e4', 1));

    // depth 10 데이터도 일부 투척 (미완성)
    accumulator.addResult(createMockResult(10, 'e2e4', 1));

    // depth 12 데이터 완성 추진
    accumulator.addResult(createMockResult(12, 'e2e4', 1));
    accumulator.addResult(createMockResult(12, 'd2d4', 2));

    // 이 단계에서 maxCompletedDepth = 12 가 되고, keepThreshold = 12 - 2 = 10 이 적용됨.
    // 따라서 10 미만인 depth 8 맵은 frames 맵에서 완전히 삭제(purge)되어 노드 무임승차를 방지함.
    // 비공개 속성 frames 검정을 수행하여 자원 누수가 차단되었는지 안전 계측함.
    const internalFrames = (accumulator as any).frames as Map<number, any>;
    
    expect(internalFrames.has(12)).toBe(true);  // 최신 완성 depth는 보유
    expect(internalFrames.has(10)).toBe(true);  // keepThreshold(10) 이상이므로 보유
    expect(internalFrames.has(8)).toBe(false);   // keepThreshold(10) 미만이므로 완벽 청소됨!
  });

  it('depth 19 완성 프레임은 진행 상태, depth 20 완성 프레임은 완료 상태로 처리되는지 통합 검증', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' }
    ];
    
    // 1. targetDepth = 20 으로 세션 분석을 초기화 및 시작
    localAnalysisStore.startAnalysis(candidateMoves, FEN, 1, 20);
    expect(localAnalysisStore.status).toBe('analyzing');
    expect(localAnalysisStore.completedFrameDepth).toBe(null);

    const accumulator = new MultiPvFrameAccumulator(2);

    // 2. Depth 19 로 프레임 완성 시뮬레이션
    accumulator.addResult(createMockResult(19, 'e2e4', 1));
    const frame19 = accumulator.addResult(createMockResult(19, 'd2d4', 2));
    
    expect(frame19).not.toBeNull();
    
    // 이 완성된 depth 19 프레임을 스토어에 반영
    localAnalysisStore.replaceEvaluationFrame(frame19!);
    
    // depth 19 는 targetDepth (20) 미만이므로 상위 상태인 'completed' 가 아닌 'depth-progress' 진행 상태여야 함
    expect(localAnalysisStore.status).toBe('depth-progress');
    expect(localAnalysisStore.completedFrameDepth).toBe(19);

    // 3. Depth 20 으로 프레임 완성 시뮬레이션
    accumulator.addResult(createMockResult(20, 'e2e4', 1));
    const frame20 = accumulator.addResult(createMockResult(20, 'd2d4', 2));

    expect(frame20).not.toBeNull();

    // 이 완성된 depth 20 프레임을 스토어에 반영
    localAnalysisStore.replaceEvaluationFrame(frame20!);

    // depth 20 은 targetDepth (20) 이상이므로 최종 분석 'completed' (완료) 상태가 되어야 함
    expect(localAnalysisStore.status).toBe('completed');
    expect(localAnalysisStore.completedFrameDepth).toBe(20);
  });

  it('회귀 테스트 - 일부 PV만 depth 20에 도달하고 전체 MultiPV 프레임은 depth 19인 경우 completed가 되면 안 됨', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' }
    ];
    
    // targetDepth = 20 으로 시작
    localAnalysisStore.startAnalysis(candidateMoves, FEN, 1, 20);
    expect(localAnalysisStore.status).toBe('analyzing');

    const accumulator = new MultiPvFrameAccumulator(2);

    // 1번 Move가 depth 20에 도달
    const r1_20 = createMockResult(20, 'e2e4', 1);
    const frame20_part = accumulator.addResult(r1_20);
    expect(frame20_part).toBeNull(); // 2번 Move가 없어서 depth 20 프레임은 미완성

    // 2번 Move가 depth 19에 도달
    const r2_19 = createMockResult(19, 'd2d4', 2);
    // 1번 Move를 depth 19로도 축적하여 depth 19 프레임을 완성시킴
    accumulator.addResult(createMockResult(19, 'e2e4', 1));
    const frame19 = accumulator.addResult(r2_19);
    
    expect(frame19).not.toBeNull(); 
    
    // 이 완성된 depth 19 프레임을 스토어에 반영
    localAnalysisStore.replaceEvaluationFrame(frame19!);
    
    // 완성 프레임의 최소 depth는 19이므로 status는 completed가 아닌 depth-progress 이어야 하고 completedFrameDepth는 19여야 합니다
    expect(localAnalysisStore.status).toBe('depth-progress');
    expect(localAnalysisStore.completedFrameDepth).toBe(19);
  });

  it('회귀 테스트 - targetDepth 가 24일 때, 일부 후보수만 depth 24인 상태이고 다른 후보수가 depth 23 이하인 경우 completed가 되지 않고 계속 진행 상태(depth-progress) 또는 analyzing 상태여야 함', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' }
    ];
    
    // targetDepth = 24 로 시작
    localAnalysisStore.startAnalysis(candidateMoves, FEN, 1, 24);
    expect(localAnalysisStore.status).toBe('analyzing');

    const accumulator = new MultiPvFrameAccumulator(2);

    // 1번 후보수(e2e4)는 이미 depth 24에 도달
    accumulator.addResult(createMockResult(24, 'e2e4', 1));
    // 2번 후보수(d2d4)는 아직 depth 23에 머무름
    accumulator.addResult(createMockResult(23, 'e2e4', 1));
    const frame23 = accumulator.addResult(createMockResult(23, 'd2d4', 2));
    expect(frame23).not.toBeNull();

    // 이 완성된 depth 23 프레임을 스토어에 반영
    localAnalysisStore.replaceEvaluationFrame(frame23!);

    // 완성이 완료되기 전(즉 모든 프레임의 최소 depth가 24가 되기 전)에는 계속 depth-progress 여야 함
    expect(localAnalysisStore.status).not.toBe('completed');
    expect(localAnalysisStore.completedFrameDepth).toBe(23);
  });

  it('정밀 회귀 테스트 - targetDepth 24일 때, 3개 후보수 중 2개만 24이고 1개가 23인 경우, 스토어 status가 절대 completed가 아님을 보장', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' },
      { uci: 'g1f3', san: 'Nf3' }
    ];
    localAnalysisStore.startAnalysis(candidateMoves, FEN, 1, 24);
    const accumulator = new MultiPvFrameAccumulator(3);

    // 1번, 2번 depth 24 도달
    accumulator.addResult(createMockResult(24, 'e2e4', 1));
    accumulator.addResult(createMockResult(24, 'd2d4', 2));

    // 그러나 3번째 후보수는 depth 23에 머무름
    accumulator.addResult(createMockResult(23, 'e2e4', 1));
    accumulator.addResult(createMockResult(23, 'd2d4', 2));
    const frame23 = accumulator.addResult(createMockResult(23, 'g1f3', 3));

    expect(frame23).not.toBeNull();
    localAnalysisStore.replaceEvaluationFrame(frame23!);

    // 아직 depth 23 프레임이 최선이므로 completed가 되지 않고 depth-progress 상태 유지 검증
    expect(localAnalysisStore.status).toBe('depth-progress');
    expect(localAnalysisStore.completedFrameDepth).toBe(23);
  });
});

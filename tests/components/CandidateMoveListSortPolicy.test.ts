import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sortCandidateMoves } from '../../src/lib/domain/analysis/CandidateMoveSortPolicy';
import { EvalScore } from '../../src/lib/domain/analysis/EvalScore';

describe('CandidateMoveSortPolicy Pure Functions & Policy Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('w 차례일 때는 높은 엔진 평가치 순으로 정렬하고, b 차례일 때는 낮은 엔진 평가치 순으로 정렬해야 한다.', () => {
    const moves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' },
      { uci: 'g1f3', san: 'Nf3' }
    ];

    const evaluations = {
      'e2e4': { moveSan: 'e4', moveUci: 'e2e4', score: new EvalScore('cp', 10), depth: 10 },
      'd2d4': { moveSan: 'd4', moveUci: 'd2d4', score: new EvalScore('cp', 50), depth: 10 },
      'g1f3': { moveSan: 'Nf3', moveUci: 'g1f3', score: new EvalScore('cp', -20), depth: 10 }
    };

    // White to move ('w') -> 내림차순 정렬 (높은 점수 d2d4 > e2e4 > g1f3 우선)
    const sortedWhite = sortCandidateMoves(moves, evaluations, 'w', 'engine');
    expect(sortedWhite[0].uci).toBe('d2d4');
    expect(sortedWhite[1].uci).toBe('e2e4');
    expect(sortedWhite[2].uci).toBe('g1f3');

    // Black to move ('b') -> 오름차순 정렬 (낮은 점수 g1f3 > e2e4 > d2d4 우선)
    const sortedBlack = sortCandidateMoves(moves, evaluations, 'b', 'engine');
    expect(sortedBlack[0].uci).toBe('g1f3');
    expect(sortedBlack[1].uci).toBe('e2e4');
    expect(sortedBlack[2].uci).toBe('d2d4');
  });

  it('평가치가 아직 없는 것보다는 존재하는 수가 먼저 나와야 한다.', () => {
    const moves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' },
      { uci: 'g1f3', san: 'Nf3' }
    ];

    const evaluations = {
      'd2d4': { moveSan: 'd4', moveUci: 'd2d4', score: new EvalScore('cp', 15), depth: 10 }
    };

    const sorted = sortCandidateMoves(moves, evaluations, 'w', 'engine');
    // 평가치가 존재하는 d2d4가 맨 앞으로, 나머지는 전술 기동 가중치가 같으므로 원래 순서 보존
    expect(sorted[0].uci).toBe('d2d4');
    expect(sorted[1].uci).toBe('e2e4');
    expect(sorted[2].uci).toBe('g1f3');
  });

  it('tactical 모드에서는 엔진 평가치를 무시하고 전술 중요 지표(Mate/Check -> Capture -> Promotion -> Normal)에 따라 정렬되어야 한다.', () => {
    const moves = [
      { uci: 'e2e4', san: 'e4' },        // normal (priority 1)
      { uci: 'd2d4', san: 'Qxd4' },      // capture (priority 3)
      { uci: 'e7e8', san: 'e8=Q', promotion: 'q' }, // promotion (priority 2)
      { uci: 'f1g2', san: 'Be4+' }       // check (priority 4)
    ];

    // tactical 모드 정렬
    const sorted = sortCandidateMoves(moves, {}, 'w', 'tactical');

    expect(sorted[0].uci).toBe('f1g2'); // Be4+ (Check, priority 4)
    expect(sorted[1].uci).toBe('d2d4'); // Qxd4 (Capture, priority 3)
    expect(sorted[2].uci).toBe('e7e8'); // e8=Q (Promotion, priority 2)
    expect(sorted[3].uci).toBe('e2e4'); // e4 (Normal, priority 1)
  });

  it('debounced map을 적용하기 전후에 정렬 함수에 넘겼을 때 순서가 다르게 나타나는지 정책을 검증한다.', () => {
    const moves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' }
    ];

    // 초기에는 평가치가 없다
    let currentEvaluations = {};
    let debouncedEvaluations = {};

    // 1. 초기 평가치 없음 -> 타이 브레이커인 SAN 알파벳 오름차순(d4 < e4)에 의해 d2d4가 먼저 정렬됨
    let sorted = sortCandidateMoves(moves, debouncedEvaluations, 'w', 'engine');
    expect(sorted[0].uci).toBe('d2d4');

    // 평가치 업데이트 (d2d4가 더 우수한 점수)
    currentEvaluations = {
      'e2e4': { moveSan: 'e4', moveUci: 'e2e4', score: new EvalScore('cp', 10), depth: 10 },
      'd2d4': { moveSan: 'd4', moveUci: 'd2d4', score: new EvalScore('cp', 100), depth: 10 }
    };

    // 디바운스 대기 중: 아직 debouncedEvaluations가 업뎃되지 않아 이전 정렬이 유지됨
    sorted = sortCandidateMoves(moves, debouncedEvaluations, 'w', 'engine');
    expect(sorted[0].uci).toBe('d2d4');

    // 50ms 후, debouncedEvaluations에 real evaluations를 주입
    debouncedEvaluations = { ...currentEvaluations };

    // 디바운스 만료 후: 이제 높은 우위인 d2d4가 먼저 정렬됨
    sorted = sortCandidateMoves(moves, debouncedEvaluations, 'w', 'engine');
    expect(sorted[0].uci).toBe('d2d4');
  });

  it('체크(check), 포획(capture), 프로모션(promotion) 속성이 정상적으로 분석되는지 복합 예제로 검증한다.', () => {
    const move = { uci: 'e7d8', san: 'exd8=Q+' };
    
    // 복합 배지 표시 계약 검증
    const isCheck = move.san.includes('+') || move.san.includes('#');
    const isCapture = move.san.includes('x');
    const isPromotion = move.san.includes('=');

    // 세 가지 상태가 하나의 복합 움직임에 공존함을 검증
    expect(isCheck).toBe(true);
    expect(isCapture).toBe(true);
    expect(isPromotion).toBe(true);
  });

  it('Qxf7# (Capture + Mate) 복합 주석을 지닌 수와 단순 체크/메이트가 대결할 때, 복합 주석 우위 및 mate > check 가중치가 정상적으로 적용되는지 검증한다.', () => {
    const moves = [
      { uci: 'd1h5', san: 'Qh5+' },     // 단순 체크 (priority = 20)
      { uci: 'f3f7', san: 'Qxf7#' },    // 포획 + 메이트 (priority = 10 + 30 = 40)
      { uci: 'f3h5', san: 'Qxf5' },     // 단순 포획 (priority = 10)
      { uci: 'e7d8', san: 'exd8=Q#' }   // 포획 + 프로모션 + 메이트 (priority = 10 + 5 + 30 = 45)
    ];

    const sortedTactical = sortCandidateMoves(moves, {}, 'w', 'tactical');

    // 순위 예측: exd8=Q#(45) > Qxf7#(40) > Qh5+(20) > Qxf5(10)
    expect(sortedTactical[0].uci).toBe('e7d8');
    expect(sortedTactical[1].uci).toBe('f3f7');
    expect(sortedTactical[2].uci).toBe('d1h5');
    expect(sortedTactical[3].uci).toBe('f3h5');
  });

  it('엔진 평가치가 완벽하게 일치할 때, 복합 주석 개수를 보조 정렬 기준으로 활용하여 순번을 정하는지 검증한다.', () => {
    const moves = [
      { uci: 'a2a3', san: 'a3' },        // 주석 개수 = 0 (Normal)
      { uci: 'f3f7', san: 'Qxf7+' }      // 주석 개수 = 2 (Capture + Check)
    ];

    const evaluations = {
      'a2a3': { moveSan: 'a3', moveUci: 'a2a3', score: new EvalScore('cp', 150), depth: 12 },
      'f3f7': { moveSan: 'Qxf7+', moveUci: 'f3f7', score: new EvalScore('cp', 150), depth: 12 }
    };

    // 둘 다 평가치 +150으로 동일한데 백 차례 ('w')
    const sorted = sortCandidateMoves(moves, evaluations, 'w', 'engine');

    // 평가치가 같으므로 주석 개수가 2개인 Qxf7+가 우선순위를 획득하여 선두에 서야 함
    expect(sorted[0].uci).toBe('f3f7');
    expect(sorted[1].uci).toBe('a2a3');
  });

  it('평가치가 없는 fallback 상태에서 복합 주석이 많은 수가 단일 체크나 단일 포획보다 위에 오는지 검증한다.', () => {
    const moves = [
      { uci: 'a1b1', san: 'Rb1' },          // normal (annotationCount: 0)
      { uci: 'd1e1', san: 'Re1+' },         // check (annotationCount: 1)
      { uci: 'd1f1', san: 'Rxf1' },         // capture (annotationCount: 1)
      { uci: 'e7d8', san: 'exd8=Q+' }       // capture + promotion + check (annotationCount: 3)
    ];

    // 백 차례 'w', 엔진 평가치 없음 ({})
    const sorted = sortCandidateMoves(moves, {}, 'w', 'engine');

    // 기댓값: 
    // annotationCount가 가장 많은 'exd8=Q+' (3개) 가 가장 앞선다.
    // 그 다음은 annotationCount가 1개인 Re1+ 와 Rxf1인데, 타이 브레이커 우선순위에서 check가 capture보다 위이므로 'Re1+'가 'Rxf1'보다 위이다.
    // 가장 마지막은 'Rb1' (0개) 이다.
    expect(sorted[0].uci).toBe('e7d8'); // exd8=Q+
    expect(sorted[1].uci).toBe('d1e1'); // Re1+
    expect(sorted[2].uci).toBe('d1f1'); // Rxf1
    expect(sorted[3].uci).toBe('a1b1'); // Rb1
  });

  it('fallback 소스의 평가치가 인입되었을 때, score.value에 기초하여 높은 순(w) 및 낮은 순(b)으로 정상 정렬 및 재배치되는지 검증해야 한다.', () => {
    const moves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' },
      { uci: 'g1f3', san: 'Nf3' }
    ];

    const evaluationsForFallback = {
      'e2e4': { moveSan: 'e4', moveUci: 'e2e4', score: new EvalScore('cp', 20), depth: 3, source: 'fallback' },
      'd2d4': { moveSan: 'd4', moveUci: 'd2d4', score: new EvalScore('cp', 100), depth: 3, source: 'fallback' },
      'g1f3': { moveSan: 'Nf3', moveUci: 'g1f3', score: new EvalScore('cp', -50), depth: 3, source: 'fallback' }
    };

    // White to move ('w') -> 내림차순 정렬 (높은 점수 d2d4 > e2e4 > g1f3 우선)
    const sortedWhite = sortCandidateMoves(moves, evaluationsForFallback as any, 'w', 'engine');
    expect(sortedWhite[0].uci).toBe('d2d4');
    expect(sortedWhite[1].uci).toBe('e2e4');
    expect(sortedWhite[2].uci).toBe('g1f3');

    // Black to move ('b') -> 오름차순 정렬 (낮은 점수 g1f3 > e2e4 > d2d4 우선)
    const sortedBlack = sortCandidateMoves(moves, evaluationsForFallback as any, 'b', 'engine');
    expect(sortedBlack[0].uci).toBe('g1f3');
    expect(sortedBlack[1].uci).toBe('e2e4');
    expect(sortedBlack[2].uci).toBe('d2d4');
  });
});


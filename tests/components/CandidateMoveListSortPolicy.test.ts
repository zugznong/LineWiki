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

    // 1. 초기 평가치 없음 -> 원래의 내추럴 순서 보장
    let sorted = sortCandidateMoves(moves, debouncedEvaluations, 'w', 'engine');
    expect(sorted[0].uci).toBe('e2e4');

    // 평가치 업데이트 (d2d4가 더 우수한 점수)
    currentEvaluations = {
      'e2e4': { moveSan: 'e4', moveUci: 'e2e4', score: new EvalScore('cp', 10), depth: 10 },
      'd2d4': { moveSan: 'd4', moveUci: 'd2d4', score: new EvalScore('cp', 100), depth: 10 }
    };

    // 디바운스 대기 중: 아직 debouncedEvaluations가 업뎃되지 않아 이전 정렬이 유지됨
    sorted = sortCandidateMoves(moves, debouncedEvaluations, 'w', 'engine');
    expect(sorted[0].uci).toBe('e2e4');

    // 50ms 후, debouncedEvaluations에 real evaluations를 주입
    debouncedEvaluations = { ...currentEvaluations };

    // 디바운스 만료 후: 이제 높은 우위인 d2d4가 먼저 정렬됨
    sorted = sortCandidateMoves(moves, debouncedEvaluations, 'w', 'engine');
    expect(sorted[0].uci).toBe('d2d4');
  });
});

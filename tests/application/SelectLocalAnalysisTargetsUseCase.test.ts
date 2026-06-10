import { describe, it, expect } from 'vitest';
import { SelectLocalAnalysisTargetsUseCase } from '../../src/lib/application/analysis/SelectLocalAnalysisTargetsUseCase';
import type { EngineMoveEvaluation } from '../../src/lib/domain/analysis/AnalysisTypes';

describe('SelectLocalAnalysisTargetsUseCase Tests', () => {
  const useCase = new SelectLocalAnalysisTargetsUseCase();

  it('should include moves with no stored (DB) evaluations', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' }
    ];
    const storedEvaluations: Record<string, EngineMoveEvaluation> = {};

    const targets = useCase.execute(candidateMoves, storedEvaluations);

    expect(targets).toHaveLength(2);
    expect(targets[0].uci).toBe('e2e4');
    expect(targets[1].uci).toBe('d2d4');
  });

  it('should filter out moves that have highly refined DB evaluations (depth >= 18)', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' },
      { uci: 'd2d4', san: 'd4' }
    ];
    const storedEvaluations: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: null,
        depth: 20
      }
    };

    // e2e4는 depth가 20으로 충분히 높으므로 제외되며, d2d4는 DB 결과가 없기 때문에 로컬 분석 대상으로 반환되어야 함.
    const targets = useCase.execute(candidateMoves, storedEvaluations, { minDepth: 18 });

    expect(targets).toHaveLength(1);
    expect(targets[0].uci).toBe('d2d4');
  });

  it('should keep moves with lower DB depth than configured threshold', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' }
    ];
    const storedEvaluations: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: null,
        depth: 12
      }
    };

    // DB depth 가 12로 기준치 18보다 낮으므로 로컬 보강 분석 대상으로 넘김
    const targets = useCase.execute(candidateMoves, storedEvaluations, { minDepth: 18 });

    expect(targets).toHaveLength(1);
    expect(targets[0].uci).toBe('e2e4');
  });

  it('should include moves with expired (too old) stored evaluations', () => {
    const candidateMoves = [
      { uci: 'e2e4', san: 'e4' }
    ];
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 32);

    const storedEvaluations: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: null,
        depth: 22,
        updatedAt: oneMonthAgo.toISOString()
      }
    };

    // DB depth가 22로 충분히 깊지만, 30일보다 오래된 데이터이므로 새로 분석을 수행하도록 대상으로 남겨야 함.
    const targets = useCase.execute(candidateMoves, storedEvaluations, { minDepth: 18, maxAgeMs: 30 * 24 * 60 * 60 * 1000 });

    expect(targets).toHaveLength(1);
    expect(targets[0].uci).toBe('e2e4');
  });
});

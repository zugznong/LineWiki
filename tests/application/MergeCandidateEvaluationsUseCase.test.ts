import { describe, it, expect } from 'vitest';
import { MergeCandidateEvaluationsUseCase } from '../../src/lib/application/analysis/MergeCandidateEvaluationsUseCase';
import type { EngineMoveEvaluation } from '../../src/lib/domain/analysis/AnalysisTypes';
import { EvalScore } from '../../src/lib/domain/analysis/EvalScore';

describe('MergeCandidateEvaluationsUseCase Tests', () => {
  const useCase = new MergeCandidateEvaluationsUseCase();

  it('should prioritize DB evaluation when local evaluation is not available', () => {
    const stored: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: new EvalScore('cp', 35),
        depth: 20
      }
    };
    const local: Record<string, EngineMoveEvaluation> = {};

    const merged = useCase.execute(stored, local);

    expect(merged['e2e4']).toBeDefined();
    expect(merged['e2e4'].source).toBe('db');
    expect(merged['e2e4'].score?.value).toBe(35);
  });

  it('should use local evaluation when DB evaluation is not available', () => {
    const stored: Record<string, EngineMoveEvaluation> = {};
    const local: Record<string, EngineMoveEvaluation> = {
      'g1f3': {
        moveSan: 'Nf3',
        moveUci: 'g1f3',
        score: new EvalScore('cp', 15),
        depth: 10
      }
    };

    const merged = useCase.execute(stored, local);

    expect(merged['g1f3']).toBeDefined();
    expect(merged['g1f3'].source).toBe('local');
    expect(merged['g1f3'].score?.value).toBe(15);
  });

  it('should prioritize DB evaluation over local by default', () => {
    const stored: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: new EvalScore('cp', 35),
        depth: 12,
        trustedDepth: 12
      }
    };
    const local: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: new EvalScore('cp', 45),
        depth: 18
      }
    };

    const merged = useCase.execute(stored, local);

    expect(merged['e2e4']).toBeDefined();
    expect(merged['e2e4'].source).toBe('db');
    expect(merged['e2e4'].score?.value).toBe(35); // DB 평가치 우선
    expect(merged['e2e4'].trustedDepth).toBe(12); // trustedDepth 값 보존됨을 확인
  });

  it('should fallback to local evaluation if DB evaluation depth is less than minDbDepth and local depth is higher', () => {
    const stored: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: new EvalScore('cp', 35),
        depth: 8
      }
    };
    const local: Record<string, EngineMoveEvaluation> = {
      'e2e4': {
        moveSan: 'e4',
        moveUci: 'e2e4',
        score: new EvalScore('cp', 50),
        depth: 15
      }
    };

    const merged = useCase.execute(stored, local, { minDbDepth: 10 });

    expect(merged['e2e4']).toBeDefined();
    expect(merged['e2e4'].source).toBe('local'); // 로컬로 대체됨 (8 < 10 이며 로컬이 depth=15로 리치함)
    expect(merged['e2e4'].score?.value).toBe(50);
  });
});

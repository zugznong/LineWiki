import { describe, it, expect } from 'vitest';
import { MergeCandidateEvaluationsUseCase } from '../../src/lib/application/analysis/MergeCandidateEvaluationsUseCase';
import { StoredEvaluationPolicy } from '../../src/lib/domain/analysis/StoredEvaluationPolicy';
import type { EngineMoveEvaluation } from '../../src/lib/domain/analysis/AnalysisTypes';
import { EvalScore } from '../../src/lib/domain/analysis/EvalScore';

describe('MergeCandidateEvaluationsUseCase Tests', () => {
  it('should prioritize DB evaluation when local evaluation is not available', () => {
    const policy = new StoredEvaluationPolicy({ minDepth: 18 });
    const useCase = new MergeCandidateEvaluationsUseCase(policy);
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
    const policy = new StoredEvaluationPolicy({ minDepth: 18 });
    const useCase = new MergeCandidateEvaluationsUseCase(policy);
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

  it('should prioritize DB evaluation over local by default if DB is trusted', () => {
    const policy = new StoredEvaluationPolicy({ minDepth: 10 });
    const useCase = new MergeCandidateEvaluationsUseCase(policy);
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

  it('should fallback to local evaluation if DB evaluation is not trusted and local is available and valid', () => {
    const policy = new StoredEvaluationPolicy({ minDepth: 10 }); // DB depth=8 은 10 이하이므로 불신뢰
    const useCase = new MergeCandidateEvaluationsUseCase(policy);
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

    const merged = useCase.execute(stored, local);

    expect(merged['e2e4']).toBeDefined();
    expect(merged['e2e4'].source).toBe('local'); // 로컬로 대체됨 (신뢰 조건을 충족하지 못해 로컬이 depth=15로 리치함)
    expect(merged['e2e4'].score?.value).toBe(50);
  });

  describe('회귀 테스트 - MergeCandidateEvaluationsUseCase', () => {
    it('신뢰 가능한 DB가 로컬보다 우선하는 경우', () => {
      const policy = new StoredEvaluationPolicy({ minDepth: 18 });
      const useCase = new MergeCandidateEvaluationsUseCase(policy);
      const stored: Record<string, EngineMoveEvaluation> = {
        'e2e4': {
          moveSan: 'e4',
          moveUci: 'e2e4',
          score: new EvalScore('cp', 40),
          depth: 20, // minDepth인 18보다 크므로 신뢰 가능
          trustedDepth: 20
        }
      };
      const local: Record<string, EngineMoveEvaluation> = {
        'e2e4': {
          moveSan: 'e4',
          moveUci: 'e2e4',
          score: new EvalScore('cp', 60),
          depth: 15
        }
      };

      const merged = useCase.execute(stored, local);

      expect(merged['e2e4']).toBeDefined();
      expect(merged['e2e4'].source).toBe('db');
      expect(merged['e2e4'].score?.value).toBe(40); // DB 점수가 상속 및 고수되어야 함
    });

    it('신뢰하지 못하는 DB를 로컬이 대체하는 경우', () => {
      const policy = new StoredEvaluationPolicy({ minDepth: 18 });
      const useCase = new MergeCandidateEvaluationsUseCase(policy);
      const stored: Record<string, EngineMoveEvaluation> = {
        'e2e4': {
          moveSan: 'e4',
          moveUci: 'e2e4',
          score: new EvalScore('cp', 40),
          depth: 10 // minDepth인 18보다 낮으므로 신뢰하지 못함
        }
      };
      const local: Record<string, EngineMoveEvaluation> = {
        'e2e4': {
          moveSan: 'e4',
          moveUci: 'e2e4',
          score: new EvalScore('cp', 60),
          depth: 20 // 유효하게 동작하고 있는 로컬 Stockfish
        }
      };

      const merged = useCase.execute(stored, local);

      expect(merged['e2e4']).toBeDefined();
      expect(merged['e2e4'].source).toBe('local');
      expect(merged['e2e4'].score?.value).toBe(60); // 로컬 신규 수치가 덮어써야 함
    });

    it('실제 Stockfish도 없을 때만 보존된 구세대 DB 결과가 db-stale로 사용되는 경우', () => {
      const policy = new StoredEvaluationPolicy({ minDepth: 18 });
      const useCase = new MergeCandidateEvaluationsUseCase(policy);
      
      // DB 평가는 존재하지만 얕고(depth 5), 실제 로컬 Stockfish도 활성 연산 스코어가 전혀 없는 상황(undefined)
      const stored: Record<string, EngineMoveEvaluation> = {
        'e2e4': {
          moveSan: 'e4',
          moveUci: 'e2e4',
          score: new EvalScore('cp', 20),
          depth: 5
        }
      };
      const local: Record<string, EngineMoveEvaluation> = {};

      const merged = useCase.execute(stored, local);

      expect(merged['e2e4']).toBeDefined();
      expect(merged['e2e4'].source).toBe('db-stale'); // 새로운 보조 상태 분류 조건 성립
      expect(merged['e2e4'].score?.value).toBe(20);
    });

    it('DB 평가조차 아예 누락되었고 로컬 결과도 유효하지 않을 때 순수 fallback이 반환됨', () => {
      const policy = new StoredEvaluationPolicy({ minDepth: 18 });
      const useCase = new MergeCandidateEvaluationsUseCase(policy);
      
      const stored: Record<string, EngineMoveEvaluation> = {};
      const local: Record<string, EngineMoveEvaluation> = {
        'e2e4': {
          moveSan: '',
          moveUci: 'e2e4',
          score: null,
          depth: 0
        }
      };

      const merged = useCase.execute(stored, local);

      expect(merged['e2e4']).toBeDefined();
      expect(merged['e2e4'].source).toBe('fallback');
      expect(merged['e2e4'].score).toBeNull();
    });
  });
});

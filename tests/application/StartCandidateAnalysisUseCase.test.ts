import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartCandidateAnalysisUseCase } from '../../src/lib/application/analysis/StartCandidateAnalysisUseCase';
import { evaluationStore } from '../../src/lib/stores/evaluationStore.svelte';
import { localAnalysisStore } from '../../src/lib/stores/localAnalysisStore.svelte';
import { success, failure } from '../../src/lib/utils/result';

describe('StartCandidateAnalysisUseCase Tests', () => {
  let loadStoredEvaluationsMock: any;
  let selectLocalAnalysisTargetsMock: any;
  let startLocalAnalysisMock: any;
  let useCase: StartCandidateAnalysisUseCase;

  beforeEach(() => {
    evaluationStore.clear();

    loadStoredEvaluationsMock = {
      execute: vi.fn()
    };
    selectLocalAnalysisTargetsMock = {
      execute: vi.fn()
    };
    startLocalAnalysisMock = {
      execute: vi.fn()
    };

    useCase = new StartCandidateAnalysisUseCase(
      loadStoredEvaluationsMock,
      selectLocalAnalysisTargetsMock,
      startLocalAnalysisMock
    );
  });

  it('should load evaluations and start local analysis on targets if needs supplement', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const candidateMoves = [{ uci: 'e2e4', san: 'e4' }];
    const generation = 1;

    const mockBatch = {
      fen,
      queriedAt: new Date().toISOString(),
      evaluations: {
        'e2e4': { moveSan: 'e4', score: { type: 'cp', value: 10 }, depth: 10 }
      },
      trustMetadata: {}
    };

    loadStoredEvaluationsMock.execute.mockResolvedValue(success(mockBatch));
    selectLocalAnalysisTargetsMock.execute.mockReturnValue([{ uci: 'e2e4', san: 'e4' }]);

    await useCase.execute(fen, candidateMoves, generation);

    expect(evaluationStore.activeFen).toBe(fen);
    expect(evaluationStore.generation).toBe(generation);
    expect(evaluationStore.storedEvaluations['e2e4']).toBeDefined();
    expect(evaluationStore.sourceStatus).toBe('local-analyzing');
    expect(startLocalAnalysisMock.execute).toHaveBeenCalledWith(fen, candidateMoves, ['e2e4']);
  });

  it('should immediately complete if all moves are trusted in DB', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const candidateMoves = [{ uci: 'e2e4', san: 'e4' }];
    const generation = 1;

    const mockBatch = {
      fen,
      queriedAt: new Date().toISOString(),
      evaluations: {
        'e2e4': { moveSan: 'e4', score: { type: 'cp', value: 15 }, depth: 20 }
      },
      trustMetadata: {}
    };

    loadStoredEvaluationsMock.execute.mockResolvedValue(success(mockBatch));
    selectLocalAnalysisTargetsMock.execute.mockReturnValue([]);

    await useCase.execute(fen, candidateMoves, generation);

    expect(evaluationStore.sourceStatus).toBe('completed');
    expect(localAnalysisStore.status).toBe('completed');
    expect(localAnalysisStore.engineMode).toBe('db-only');
    expect(startLocalAnalysisMock.execute).not.toHaveBeenCalled();
  });

  it('should fallback to complete local analysis if DB load fails', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const candidateMoves = [{ uci: 'e2e4', san: 'e4' }];
    const generation = 1;

    loadStoredEvaluationsMock.execute.mockResolvedValue(failure(new Error('DB Error')));

    await useCase.execute(fen, candidateMoves, generation);

    expect(evaluationStore.sourceStatus).toBe('local-analyzing');
    expect(startLocalAnalysisMock.execute).toHaveBeenCalledWith(fen, candidateMoves);
  });

  it('should ignore DB result if the current generation changes before DB loads', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const candidateMoves = [{ uci: 'e2e4', san: 'e4' }];
    const generation = 1;

    let resolveDb: any;
    const dbPromise = new Promise((resolve) => {
      resolveDb = resolve;
    });
    loadStoredEvaluationsMock.execute.mockReturnValue(dbPromise);

    const runPromise = useCase.execute(fen, candidateMoves, generation);

    evaluationStore.beginPosition('different_fen', 2);

    const mockBatch = {
      fen,
      queriedAt: new Date().toISOString(),
      evaluations: { 'e2e4': { moveSan: 'e4', score: { type: 'cp', value: 10 }, depth: 10 } },
      trustMetadata: {}
    };
    resolveDb(success(mockBatch));

    await runPromise;

    expect(evaluationStore.activeFen).toBe('different_fen');
    expect(evaluationStore.generation).toBe(2);
    expect(evaluationStore.storedEvaluations).toEqual({});
    expect(startLocalAnalysisMock.execute).not.toHaveBeenCalled();
  });

  describe('회귀 테스트 - StartCandidateAnalysisUseCase', () => {
    it('DB 전체 적중 시 로컬 엔진이 시작되지 않는 경우', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const candidateMoves = [{ uci: 'e2e4', san: 'e4' }];
      const generation = 1;

      const mockBatch = {
        fen,
        queriedAt: new Date().toISOString(),
        evaluations: {
          'e2e4': { moveSan: 'e4', score: { type: 'cp', value: 15 }, depth: 20 }
        },
        trustMetadata: {}
      };

      loadStoredEvaluationsMock.execute.mockResolvedValue(success(mockBatch));
      // selectLocalAnalysisTargets가 빈 배치를 반환하여 더 이상 분석할 타겟이 없음을 의미
      selectLocalAnalysisTargetsMock.execute.mockReturnValue([]);

      await useCase.execute(fen, candidateMoves, generation);

      expect(evaluationStore.sourceStatus).toBe('completed');
      expect(localAnalysisStore.status).toBe('completed');
      expect(localAnalysisStore.engineMode).toBe('db-only');
      expect(startLocalAnalysisMock.execute).not.toHaveBeenCalled();
    });

    it('DB 일부 적중 시 누락 후보수만 로컬 대상으로 전달되는 경우', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const candidateMoves = [
        { uci: 'e2e4', san: 'e4' },
        { uci: 'd2d4', san: 'd4' }
      ];
      const generation = 1;

      const mockBatch = {
        fen,
        queriedAt: new Date().toISOString(),
        evaluations: {
          'e2e4': { moveSan: 'e4', score: { type: 'cp', value: 15 }, depth: 20 }
        },
        trustMetadata: {}
      };

      loadStoredEvaluationsMock.execute.mockResolvedValue(success(mockBatch));
      // e2e4는 DB에 있지만 d2d4는 누락되었으므로 d2d4만 로컬 대상으로 판별
      selectLocalAnalysisTargetsMock.execute.mockReturnValue([{ uci: 'd2d4', san: 'd4' }]);

      await useCase.execute(fen, candidateMoves, generation);

      expect(evaluationStore.sourceStatus).toBe('local-analyzing');
      expect(startLocalAnalysisMock.execute).toHaveBeenCalledWith(fen, candidateMoves, ['d2d4']);
    });

    it('DB 조회 실패 시 전체 후보수가 로컬 분석되는 경우', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const candidateMoves = [
        { uci: 'e2e4', san: 'e4' },
        { uci: 'd2d4', san: 'd4' }
      ];
      const generation = 1;

      loadStoredEvaluationsMock.execute.mockResolvedValue(failure(new Error('네트워크 타임아웃')));

      await useCase.execute(fen, candidateMoves, generation);

      expect(evaluationStore.sourceStatus).toBe('local-analyzing');
      // DB 조회가 완전히 수포로 돌아갔으므로, 후보수 목록 전체를 통째로 로컬 분석 엔진에 인가
      expect(startLocalAnalysisMock.execute).toHaveBeenCalledWith(fen, candidateMoves);
    });
  });
});

import { StockfishWorkerAdapter } from '../adapters/analysis/local/StockfishWorkerAdapter';
import { DisabledServerAnalysisAdapter } from '../adapters/analysis/server/DisabledServerAnalysisAdapter';
import { DisabledStoredEvaluationAdapter } from '../adapters/analysis/stored/DisabledStoredEvaluationAdapter';
import { StartLocalAnalysisUseCase } from '../application/analysis/StartLocalAnalysisUseCase';
import { StopLocalAnalysisUseCase } from '../application/analysis/StopLocalAnalysisUseCase';
import { DisposeLocalAnalysisUseCase } from '../application/analysis/DisposeLocalAnalysisUseCase';
import { GetServerAnalysisStatusUseCase } from '../application/analysis/GetServerAnalysisStatusUseCase';
import { LoadStoredEvaluationsUseCase } from '../application/analysis/LoadStoredEvaluationsUseCase';
import { MergeCandidateEvaluationsUseCase } from '../application/analysis/MergeCandidateEvaluationsUseCase';
import { SelectLocalAnalysisTargetsUseCase } from '../application/analysis/SelectLocalAnalysisTargetsUseCase';
import type { ChessEnginePort } from '../ports/ChessEnginePort';

let cachedLocalAnalysis: StockfishWorkerAdapter | null = null;
let cachedServerAnalysis: DisabledServerAnalysisAdapter | null = null;
let cachedStoredEvaluation: DisabledStoredEvaluationAdapter | null = null;

export function createAnalysisServices(chessEngine: ChessEnginePort) {
  if (!cachedLocalAnalysis) {
    cachedLocalAnalysis = new StockfishWorkerAdapter();
  }
  if (!cachedServerAnalysis) {
    cachedServerAnalysis = new DisabledServerAnalysisAdapter();
  }
  if (!cachedStoredEvaluation) {
    cachedStoredEvaluation = new DisabledStoredEvaluationAdapter();
  }

  const startLocalAnalysis = new StartLocalAnalysisUseCase(cachedLocalAnalysis, chessEngine);
  const stopLocalAnalysis = new StopLocalAnalysisUseCase(cachedLocalAnalysis);
  const disposeLocalAnalysis = new DisposeLocalAnalysisUseCase(cachedLocalAnalysis);
  const getServerAnalysisStatus = new GetServerAnalysisStatusUseCase(cachedServerAnalysis);
  const loadStoredEvaluations = new LoadStoredEvaluationsUseCase(cachedStoredEvaluation);
  const mergeCandidateEvaluations = new MergeCandidateEvaluationsUseCase();
  const selectLocalAnalysisTargets = new SelectLocalAnalysisTargetsUseCase();

  return {
    localAnalysis: cachedLocalAnalysis,
    serverAnalysis: cachedServerAnalysis,
    storedEvaluation: cachedStoredEvaluation,
    startLocalAnalysis,
    stopLocalAnalysis,
    disposeLocalAnalysis,
    getServerAnalysisStatus,
    loadStoredEvaluations,
    mergeCandidateEvaluations,
    selectLocalAnalysisTargets
  };
}

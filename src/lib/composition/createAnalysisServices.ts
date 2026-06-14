import { ResilientLocalAnalysisAdapter } from '../adapters/analysis/local/ResilientLocalAnalysisAdapter';
import { DisabledServerAnalysisAdapter } from '../adapters/analysis/server/DisabledServerAnalysisAdapter';
import { DisabledStoredEvaluationAdapter } from '../adapters/analysis/stored/DisabledStoredEvaluationAdapter';
import { BrowserMockStoredEvaluationAdapter } from '../adapters/analysis/stored/BrowserMockStoredEvaluationAdapter';
import { StartLocalAnalysisUseCase } from '../application/analysis/StartLocalAnalysisUseCase';
import { StopLocalAnalysisUseCase } from '../application/analysis/StopLocalAnalysisUseCase';
import { DisposeLocalAnalysisUseCase } from '../application/analysis/DisposeLocalAnalysisUseCase';
import { GetServerAnalysisStatusUseCase } from '../application/analysis/GetServerAnalysisStatusUseCase';
import { LoadStoredEvaluationsUseCase } from '../application/analysis/LoadStoredEvaluationsUseCase';
import { MergeCandidateEvaluationsUseCase } from '../application/analysis/MergeCandidateEvaluationsUseCase';
import { SelectLocalAnalysisTargetsUseCase } from '../application/analysis/SelectLocalAnalysisTargetsUseCase';
import { StartCandidateAnalysisUseCase } from '../application/analysis/StartCandidateAnalysisUseCase';
import { ChangeEngineSettingsUseCase } from '../application/analysis/ChangeEngineSettingsUseCase';
import { StoredEvaluationPolicy } from '../domain/analysis/StoredEvaluationPolicy';
import type { ChessEnginePort } from '../ports/ChessEnginePort';
import type { StoredEvaluationPort } from '../ports/StoredEvaluationPort';

let cachedLocalAnalysis: ResilientLocalAnalysisAdapter | null = null;
let cachedServerAnalysis: DisabledServerAnalysisAdapter | null = null;
let cachedStoredEvaluation: StoredEvaluationPort | null = null;
let cachedStoredEvaluationPolicy: StoredEvaluationPolicy | null = null;

export function createAnalysisServices(chessEngine: ChessEnginePort) {
  if (!cachedLocalAnalysis) {
    cachedLocalAnalysis = new ResilientLocalAnalysisAdapter();
  }
  if (!cachedServerAnalysis) {
    cachedServerAnalysis = new DisabledServerAnalysisAdapter();
  }
  if (!cachedStoredEvaluation) {
    const isTestMode = typeof window !== 'undefined' && (
      (window as any).__MOCK_DB_ERROR__ !== undefined || 
      (window as any).__MOCK_DB_EVALS__ !== undefined
    );
    if (isTestMode) {
      cachedStoredEvaluation = new BrowserMockStoredEvaluationAdapter();
    } else {
      cachedStoredEvaluation = new DisabledStoredEvaluationAdapter();
    }
  }
  if (!cachedStoredEvaluationPolicy) {
    cachedStoredEvaluationPolicy = new StoredEvaluationPolicy();
  }

  const startLocalAnalysis = new StartLocalAnalysisUseCase(cachedLocalAnalysis, chessEngine);
  const stopLocalAnalysis = new StopLocalAnalysisUseCase(cachedLocalAnalysis);
  const disposeLocalAnalysis = new DisposeLocalAnalysisUseCase(cachedLocalAnalysis);
  const getServerAnalysisStatus = new GetServerAnalysisStatusUseCase(cachedServerAnalysis);
  const loadStoredEvaluations = new LoadStoredEvaluationsUseCase(cachedStoredEvaluation);
  const mergeCandidateEvaluations = new MergeCandidateEvaluationsUseCase(cachedStoredEvaluationPolicy);
  const selectLocalAnalysisTargets = new SelectLocalAnalysisTargetsUseCase(cachedStoredEvaluationPolicy);
  const startCandidateAnalysis = new StartCandidateAnalysisUseCase(
    loadStoredEvaluations,
    selectLocalAnalysisTargets,
    startLocalAnalysis
  );
  const changeEngineSettings = new ChangeEngineSettingsUseCase(
    stopLocalAnalysis,
    startCandidateAnalysis
  );

  return {
    localAnalysis: cachedLocalAnalysis,
    serverAnalysis: cachedServerAnalysis,
    storedEvaluation: cachedStoredEvaluation,
    storedEvaluationPolicy: cachedStoredEvaluationPolicy,
    startLocalAnalysis,
    stopLocalAnalysis,
    disposeLocalAnalysis,
    getServerAnalysisStatus,
    loadStoredEvaluations,
    mergeCandidateEvaluations,
    selectLocalAnalysisTargets,
    startCandidateAnalysis,
    changeEngineSettings
  };
}

import { StockfishWorkerAdapter } from '../adapters/analysis/local/StockfishWorkerAdapter';
import { DisabledServerAnalysisAdapter } from '../adapters/analysis/server/DisabledServerAnalysisAdapter';
import { StartLocalAnalysisUseCase } from '../application/analysis/StartLocalAnalysisUseCase';
import { StopLocalAnalysisUseCase } from '../application/analysis/StopLocalAnalysisUseCase';
import { DisposeLocalAnalysisUseCase } from '../application/analysis/DisposeLocalAnalysisUseCase';
import { GetServerAnalysisStatusUseCase } from '../application/analysis/GetServerAnalysisStatusUseCase';
import type { ChessEnginePort } from '../ports/ChessEnginePort';

let cachedLocalAnalysis: StockfishWorkerAdapter | null = null;
let cachedServerAnalysis: DisabledServerAnalysisAdapter | null = null;

export function createAnalysisServices(chessEngine: ChessEnginePort) {
  if (!cachedLocalAnalysis) {
    cachedLocalAnalysis = new StockfishWorkerAdapter();
  }
  if (!cachedServerAnalysis) {
    cachedServerAnalysis = new DisabledServerAnalysisAdapter();
  }

  const startLocalAnalysis = new StartLocalAnalysisUseCase(cachedLocalAnalysis, chessEngine);
  const stopLocalAnalysis = new StopLocalAnalysisUseCase(cachedLocalAnalysis);
  const disposeLocalAnalysis = new DisposeLocalAnalysisUseCase(cachedLocalAnalysis);
  const getServerAnalysisStatus = new GetServerAnalysisStatusUseCase(cachedServerAnalysis);

  return {
    localAnalysis: cachedLocalAnalysis,
    serverAnalysis: cachedServerAnalysis,
    startLocalAnalysis,
    stopLocalAnalysis,
    disposeLocalAnalysis,
    getServerAnalysisStatus
  };
}

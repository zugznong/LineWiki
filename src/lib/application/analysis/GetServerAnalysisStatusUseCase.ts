import type { ServerAnalysisPort } from '../../ports/ServerAnalysisPort';
import type { ServerAnalysisStatus } from '../../domain/analysis/ServerAnalysisStatus';

export class GetServerAnalysisStatusUseCase {
  constructor(private readonly serverAnalysis: ServerAnalysisPort) {}

  public execute(): ServerAnalysisStatus {
    return this.serverAnalysis.getStatus();
  }
}

import type { LocalAnalysisPort } from '../../ports/LocalAnalysisPort';

export class StopLocalAnalysisUseCase {
  constructor(private readonly localAnalysis: LocalAnalysisPort) {}

  public execute(): void {
    this.localAnalysis.stop();
  }
}

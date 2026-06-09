import type { LineHistoryPort } from '../../ports/LineHistoryPort';

export class ClearLineHistoryUseCase {
  constructor(private readonly lineHistoryPort: LineHistoryPort) {}

  public execute(): void {
    this.lineHistoryPort.clearHistory();
  }
}

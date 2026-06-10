import type { LineHistoryPort } from '../../ports/LineHistoryPort';
import { LineHistoryNavigationUseCase } from './LineHistoryNavigationUseCase';

export class PushLineHistoryUseCase {
  constructor(
    private readonly lineHistoryPort: LineHistoryPort,
    private readonly navigationUseCase: LineHistoryNavigationUseCase
  ) {}

  public execute(newFen: string, moveSan: string, from?: string | null, to?: string | null, previousFen?: string | null): void {
    const current = this.lineHistoryPort.loadHistory().unwrapOrDefault([]);
    const updated = this.navigationUseCase.truncateAndInsert(current, newFen, moveSan, from, to, previousFen);
    this.lineHistoryPort.saveHistory(updated);
  }
}

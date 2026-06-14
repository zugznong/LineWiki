import type { LineHistoryPort } from '../../ports/LineHistoryPort';
import { lineHistoryStore } from '../../stores/lineHistoryStore.svelte.ts';

export class ClearLineHistoryUseCase {
  constructor(private readonly lineHistoryPort: LineHistoryPort) {}

  public execute(): void {
    this.lineHistoryPort.clearHistory();
    lineHistoryStore.invalidate();
    lineHistoryStore.forceUpdate();
  }
}

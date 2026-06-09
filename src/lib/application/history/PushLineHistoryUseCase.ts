import type { LineHistoryPort } from '../../ports/LineHistoryPort';

export class PushLineHistoryUseCase {
  constructor(private readonly lineHistoryPort: LineHistoryPort) {}

  public execute(newFen: string, moveSan: string, from?: string | null, to?: string | null, previousFen?: string | null): void {
    const current = this.lineHistoryPort.loadHistory().unwrapOrDefault([]);
    
    // 히스토리가 비어 있을 때는 이전 FEN을 { fen: previousFen, moveSan: null }로 먼저 넣어줍니다.
    if (current.length === 0 && previousFen) {
      current.push({ fen: previousFen, moveSan: null });
    }
    
    current.push({ fen: newFen, moveSan, from, to });
    this.lineHistoryPort.saveHistory(current);
  }
}

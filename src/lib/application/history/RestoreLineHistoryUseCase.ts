import type { LineHistoryPort } from '../../ports/LineHistoryPort';
import type { LineSessionPort } from '../../ports/LineSessionPort';
import type { Result } from '../../utils/result';
import type { LineHistoryItem } from '../../domain/chess/LineHistory';
import { success } from '../../utils/result';

let isFirstExecution = true;

export class RestoreLineHistoryUseCase {
  constructor(
    private readonly lineHistoryPort: LineHistoryPort,
    private readonly lineSessionPort: LineSessionPort
  ) {}

  public execute(currentPath?: string): Result<LineHistoryItem[], Error> {
    // 1. 공유 링크 직접 진입 시 기존 히스토리 초기화 및 빈 상태 반환
    if (isFirstExecution) {
      isFirstExecution = false;
      const startedFromApp = this.lineSessionPort.isStartedFromApp();
      const pathname = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');
      if (pathname.includes('/fen/') && !startedFromApp) {
        this.lineHistoryPort.clearHistory();
        return success([]);
      }
    }

    const loaded = this.lineHistoryPort.loadHistory();
    
    // 2. 잘못된 히스토리 감지 시 세션 기록을 즉시 삭제하고 안전하게 복구(Self-Healing)
    if (loaded.isFailure()) {
      console.warn('저장된 수순 기록이 유효하지 않아 세션을 안전하게 정리합니다.');
      this.lineHistoryPort.clearHistory();
      return success([]);
    }

    return loaded;
  }
}

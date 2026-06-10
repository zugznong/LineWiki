import { SafeBrowserStorage } from './SafeBrowserStorage';
import type { LineHistoryPort } from '$lib/ports/LineHistoryPort';
import { LineHistory, type LineHistoryItem } from '$lib/domain/chess/LineHistory';
import type { Result } from '$lib/utils/result';
import { success, failure } from '$lib/utils/result';
import { STORAGE_KEYS } from '$lib/config/appConfig';

export class SessionLineHistoryAdapter implements LineHistoryPort {
  private readonly storage = new SafeBrowserStorage('sessionStorage');

  public loadHistory(): Result<LineHistoryItem[], Error> {
    try {
      const raw = this.storage.getItem(STORAGE_KEYS.SESSION_HISTORY);
      if (!raw) {
        return success([]);
      }

      // 악성 버퍼 또는 데이터 정체 방지 - 100KB 초과 시 파싱하지 않고 초기화
      if (raw.length > 100 * 1024) {
        console.warn(`[자가복구 경고] 세션 기보 데이터가 안전 오버헤드 범위를 크게 벗어났습니다. (${raw.length} bytes) 데이터를 자동 정화합니다.`);
        this.clearHistory();
        return success([]);
      }

      const decodeResult = LineHistory.deserialize(raw);
      if (decodeResult.isOk()) {
        return success(decodeResult.unwrap().items);
      } else {
        // 역직렬화 실패 또는 오염 발생 시 자가 복구(Clear) 기동
        console.warn(`[자가복구 경고] 변조되거나 훼손된 세션 데이터가 검출되었습니다. 데이터를 영구 소거 및 정화합니다. 사유:`, decodeResult.unwrapErr().message);
        this.clearHistory();
        return success([]);
      }
    } catch (err: any) {
      this.clearHistory();
      return failure(err);
    }
  }

  public saveHistory(history: LineHistoryItem[]): Result<void, Error> {
    try {
      const lh = new LineHistory(history);
      this.storage.setItem(STORAGE_KEYS.SESSION_HISTORY, lh.serialize());
      return success(undefined);
    } catch (err: any) {
      return failure(err);
    }
  }

  public clearHistory(): void {
    this.storage.removeItem(STORAGE_KEYS.SESSION_HISTORY);
  }
}

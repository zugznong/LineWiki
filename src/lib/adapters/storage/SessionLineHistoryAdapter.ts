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
      const decodeResult = LineHistory.deserialize(raw);
      if (decodeResult.isOk()) {
        return success(decodeResult.unwrap().items);
      } else {
        return failure(decodeResult.unwrapErr());
      }
    } catch (err: any) {
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

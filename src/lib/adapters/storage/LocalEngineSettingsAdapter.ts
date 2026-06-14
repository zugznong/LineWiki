import { EngineSettings } from '../../domain/analysis/EngineSettings';
import type { EngineSettingsPort } from '../../ports/EngineSettingsPort';
import { SafeBrowserStorage } from './SafeBrowserStorage';
import { STORAGE_KEYS } from '../../config/appConfig';

/**
 * 브라우저의 LocalStorage 영역을 안정적으로 다루고 데이터 유실 내지 손상 시
 * 완전 복구된 'auto' 안전 옵션을 돌려받는 로컬 엔진 설정 보존 장치입니다.
 */
export class LocalEngineSettingsAdapter implements EngineSettingsPort {
  private readonly storage = new SafeBrowserStorage('localStorage');
  private readonly key = STORAGE_KEYS.ENGINE_SETTINGS;

  public save(settings: EngineSettings): void {
    this.storage.setItem(this.key, JSON.stringify(settings.toJSON()));
  }

  public load(): EngineSettings {
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      return EngineSettings.createDefault();
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return EngineSettings.createDefault();
      }

      let threads = parsed.threads;
      if (threads !== 'auto' && (isNaN(Number(threads)) || Number(threads) < 1)) {
        threads = 'auto';
      }

      let hash = parsed.hash;
      if (hash !== 'auto' && ![16, 32, 64, 128, 256, 512, 1024].includes(Number(hash))) {
        hash = 'auto';
      }

      let budget = parsed.budget;
      if (budget === 'precise') {
        budget = 'deep';
      }
      if (
        budget !== 'fast' &&
        budget !== 'balanced' &&
        budget !== 'deep' &&
        budget !== 'ultra' &&
        budget !== 'max' &&
        budget !== 'expert' &&
        budget !== 'custom' &&
        budget !== 'infinite'
      ) {
        budget = 'balanced';
      }

      let customDepth = parsed.customDepth;
      if (customDepth !== undefined) {
        if (typeof customDepth !== 'number' || isNaN(customDepth) || customDepth < 1 || customDepth > 100) {
          customDepth = 20; // 안전 기본값 복구
        }
      }

      let threadSafetyEnabled = parsed.threadSafetyEnabled;
      if (threadSafetyEnabled === undefined) {
        threadSafetyEnabled = true;
      } else if (typeof threadSafetyEnabled !== 'boolean') {
        threadSafetyEnabled = true;
      }

      return new EngineSettings({
        threads: threads,
        hash: hash,
        budget: budget,
        customDepth: customDepth,
        threadSafetyEnabled: threadSafetyEnabled
      });
    } catch (err) {
      console.warn('[LocalEngineSettingsAdapter] 설정 데이터가 손상되어 안전 기본값으로 리셋 복구되었습니다.', err);
      return EngineSettings.createDefault();
    }
  }
}

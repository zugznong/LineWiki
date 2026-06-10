import { SafeBrowserStorage } from './SafeBrowserStorage';
import type { LineSessionPort } from '$lib/ports/LineSessionPort';
import { STORAGE_KEYS } from '$lib/config/appConfig';

export class SessionLineMarkerAdapter implements LineSessionPort {
  private readonly storage = new SafeBrowserStorage('sessionStorage');

  /**
   * 앱이 시작 화면(또는 기획된 정규 경로)을 거쳐 정상 실행되었는지 여부를 조회합니다.
   */
  public isStartedFromApp(): boolean {
    return this.storage.getItem(STORAGE_KEYS.STARTED_FROM_APP) === 'true';
  }

  /**
   * 시작 마커 플래그 값을 session저장소에 직접 저장합니다.
   */
  public setStartedFromApp(val: boolean): void {
    if (val) {
      this.storage.setItem(STORAGE_KEYS.STARTED_FROM_APP, 'true');
    } else {
      this.storage.removeItem(STORAGE_KEYS.STARTED_FROM_APP);
    }
  }

  /**
   * 시작 마커 정보를 sessionStorage에서 영구 초기화 및 제거합니다.
   */
  public clearSessionMarker(): void {
    this.storage.removeItem(STORAGE_KEYS.STARTED_FROM_APP);
  }
}

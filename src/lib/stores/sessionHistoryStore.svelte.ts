import { positionStore } from './positionStore.svelte.ts';
import { createAppServices } from '$lib/composition/createAppServices';
import { lineHistoryStore } from './lineHistoryStore.svelte.ts';

/**
 * sessionStorage 기반 수순 히스토리(Line-wide History) 상태를 전역적으로 조율하는 스토어입니다.
 * 탑바의 이전/다음 버튼과 전역 단축키(Alt + Arrow, [, ])가 완벽하게 동일한 데이터 정합성을 기반으로 기동되도록 일치시킵니다.
 */
class SessionHistoryStore {
  /**
   * 보관된 수순 역사 아이템 목록 전체를 가져옵니다.
   */
  public get historyItems() {
    return lineHistoryStore.historyItems;
  }

  /**
   * 수순 히스토리 버전 상태값을 조회하여 Svelte 컴포넌트의 신뢰도 높은 반응성 연쇄를 유발합니다.
   */
  public get version(): number {
    return lineHistoryStore.version;
  }

  /**
   * 실시간 sessionStorage 상의 수순 히스토리를 데이터베이스/어댑터에서 갱신 취합합니다.
   */
  public updateHistory() {
    lineHistoryStore.forceUpdate();
  }

  /**
   * 수순 기준 이전 단계로 돌아갈 수 있는 상태인지 여부를 반환합니다.
   */
  public get canGoBack(): boolean {
    return lineHistoryStore.canGoPrevious;
  }

  /**
   * 수순 기준 다음 단계로 전개할 수 있는 상태인지 여부를 반환합니다.
   */
  public get canGoForward(): boolean {
    return lineHistoryStore.canGoNext;
  }

  /**
   * 이전 단계의 FEN 문자열 값을 가져옵니다.
   */
  public getPreviousFen(): string | null {
    return lineHistoryStore.previousFen;
  }

  /**
   * 다음 단계의 FEN 문자열 값을 가져옵니다.
   */
  public getNextFen(): string | null {
    return lineHistoryStore.nextFen;
  }

  /**
   * 실제 수순 이력상의 이전 위치로 이동을 수행합니다.
   */
  public goBack() {
    const prevFen = this.getPreviousFen();
    if (prevFen) {
      const services = createAppServices();
      services.navigateMove.execute(prevFen);
      // 이동 완료 후 즉시 히스토리 캐시 및 포지션 동기화
      this.updateHistory();
    }
  }

  /**
   * 실제 수순 이력상의 다음 위치로 이동을 수행합니다.
   */
  public goForward() {
    const nextFen = this.getNextFen();
    if (nextFen) {
      const services = createAppServices();
      services.navigateMove.execute(nextFen);
      // 이동 완료 후 즉시 히스토리 캐시 및 포지션 동기화
      this.updateHistory();
    }
  }
}

export const sessionHistoryStore = new SessionHistoryStore();

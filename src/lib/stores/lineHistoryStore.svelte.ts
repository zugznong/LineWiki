import { SessionLineHistoryAdapter } from '$lib/adapters/storage/SessionLineHistoryAdapter';
import { positionStore } from './positionStore.svelte.ts';
import type { LineHistoryItem } from '$lib/domain/chess/LineHistory';

/**
 * session history 복원 결과를 전역적으로 무결성있게 캐싱하는 전역 Line History 캐시 스토어입니다.
 * 중복된 JSON 파싱과 데이터베이스 복원 호출을 원천 방지하여 성능 극대화를 전개합니다.
 */
class LineHistoryStore {
  private lastUpdatedTime = 0;
  private state = $state<{
    historyItems: LineHistoryItem[];
    isLoaded: boolean;
    version: number;
  }>({
    historyItems: [],
    isLoaded: false,
    version: 0
  });

  /**
   * 캐시된 역사 아이템 목록을 인출합니다.
   */
  public get historyItems() {
    return this.state.historyItems;
  }

  /**
   * 상태의 갱신을 안정적으로 감지하기 위한 버전 넘버를 조회합니다.
   */
  public get version(): number {
    return this.state.version;
  }

  /**
   * 캐시를 명시적으로 최초 초기화 로드합니다.
   */
  public init(): void {
    if (!this.state.isLoaded) {
      this.forceUpdate();
    }
  }

  /**
   * 현재 활성화된 FEN을 기준으로 한 히스토리 내부에서의 인덱스입니다.
   */
  public get currentIndex(): number {
    const fen = positionStore.current?.fen;
    if (!fen) return -1;
    return this.historyItems.findIndex(item => item.fen === fen);
  }

  /**
   * 기준 FEN으로부터 이전 단계가 유효한지 취합합니다.
   */
  public get canGoPrevious(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 기준 FEN으로부터 다음 단계가 유효한지 취합합니다.
   */
  public get canGoNext(): boolean {
    const idx = this.currentIndex;
    return idx !== -1 && idx < this.historyItems.length - 1;
  }

  /**
   * 이전 단계의 FEN 값입니다.
   */
  public get previousFen(): string | null {
    if (!this.canGoPrevious) return null;
    return this.historyItems[this.currentIndex - 1].fen;
  }

  /**
   * 다음 단계의 FEN 값입니다.
   */
  public get nextFen(): string | null {
    if (!this.canGoNext) return null;
    return this.historyItems[this.currentIndex + 1].fen;
  }

  /**
   * 명시적으로 세션 히스토리가 갱신되었을 때 캐시를 무효화(invalidate) 처리합니다.
   */
  public invalidate(): void {
    this.state.isLoaded = false;
  }

  /**
   * 캐시 상태를 강제로 다시 갱신 및 파싱합니다.
   */
  public forceUpdate(): void {
    const now = Date.now();
    // 8ms(한 tick 수준) 이내의 인접한 시간 동안 중복 마운트되거나 이펙트가 발생하면 sessionStorage 리파싱을 회피
    if (this.state.isLoaded && (now - this.lastUpdatedTime < 8)) {
      return;
    }

    const adapter = new SessionLineHistoryAdapter();
    const historyRes = adapter.loadHistory();
    if (historyRes.isOk()) {
       this.state.historyItems = historyRes.unwrap();
    } else {
       this.state.historyItems = [];
    }
    this.state.isLoaded = true;
    this.lastUpdatedTime = Date.now();
    this.state.version++;
  }

  /**
   * 테스트에서 lineHistoryStore를 Mocking하거나 강제로 주입하기 위해 사용하는 헬퍼입니다.
   */
  public overrideHistoryItems(items: LineHistoryItem[]): void {
    this.state.historyItems = items;
    this.state.isLoaded = true;
    this.state.version++;
  }
}

export const lineHistoryStore = new LineHistoryStore();

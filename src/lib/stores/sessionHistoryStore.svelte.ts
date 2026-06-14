import { positionStore } from './positionStore.svelte.ts';
import { createAppServices } from '$lib/composition/createAppServices';
import { lineHistoryStore } from './lineHistoryStore.svelte.ts';

function normalizeFen(fen: string): string {
  if (!fen) return '';
  const parts = fen.trim().split(/\s+/);
  const board = parts[0] || '';
  const activeColor = parts[1] || 'w';
  const castling = parts[2] || '-';
  const enPassant = parts[3] || '-';
  return `${board} ${activeColor} ${castling} ${enPassant}`;
}

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

  /**
   * 시작 FEN부터 지정된 FEN까지의 복원 가능한 UCI 수순 목록을 리턴합니다.
   * 복원 불가능하거나 해당 FEN이 수순 상에 존재하지 않으면 null을 반환합니다.
   */
  public getMovesFromStart(targetFen: string): string[] | null {
    const items = this.historyItems;
    if (!items || items.length === 0) return null;

    const normalizedTarget = normalizeFen(targetFen);
    const index = items.findIndex(item => {
      return normalizeFen(item.fen) === normalizedTarget;
    });

    if (index === -1) {
      return null;
    }

    const moves: string[] = [];
    for (let i = 1; i <= index; i++) {
      const item = items[i];
      if (!item.from || !item.to) {
        return null;
      }
      let uci = `${item.from}${item.to}`;
      if (item.moveSan) {
        const promoMatch = item.moveSan.match(/=([QRBN])/i);
        if (promoMatch) {
          uci += promoMatch[1].toLowerCase();
        } else {
          const lastChar = item.moveSan.replace(/[+#]/g, '').slice(-1);
          if (['Q', 'R', 'B', 'N'].includes(lastChar)) {
            uci += lastChar.toLowerCase();
          }
        }
      }
      moves.push(uci);
    }
    return moves;
  }

  /**
   * 수순 역사상 가장 첫 시작 포지션 FEN을 조회합니다.
   */
  public getInitialFen(): string | null {
    const items = this.historyItems;
    if (items && items.length > 0) {
      return items[0].fen;
    }
    return null;
  }

  /**
   * 수순 히스토리 상에서 현재 포지션(parts 0~3)이 몇 번 반복해서 출현했는지 계산합니다.
   * 비교 키는 전체 FEN이 아닌 piece placement + side to move + castling + en passant를 활용합니다.
   */
  public getRepetitionCount(fen: string): number {
    if (!fen) return 0;
    const items = this.historyItems;
    if (!items || items.length === 0) return 0;

    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) return 0;
    const currentKey = parts.slice(0, 4).join(' ');

    let count = 0;
    for (const item of items) {
      if (!item.fen) continue;
      const hParts = item.fen.trim().split(/\s+/);
      if (hParts.length >= 4) {
        const hKey = hParts.slice(0, 4).join(' ');
        if (hKey === currentKey) {
          count++;
        }
      }
    }
    return count;
  }
}

export const sessionHistoryStore = new SessionHistoryStore();

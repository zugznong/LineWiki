import type { LineHistoryPort } from '../../ports/LineHistoryPort';
import type { LineHistoryItem } from '../../domain/chess/LineHistory';

export interface LineHistoryNavigationResult {
  canGoPrevious: boolean;
  canGoNext: boolean;
  previousFen: string | null;
  nextFen: string | null;
}

/**
 * 현재 활성화된 FEN을 기준으로 실제 sessionStorage 상의 라인 히스토리에 매칭시켜,
 * 이전 및 다음 수순 이동의 유효성 여부 및 FEN 정보를 일괄 반정하는 유스케이스입니다.
 */
export class LineHistoryNavigationUseCase {
  constructor(private readonly lineHistoryPort: LineHistoryPort) {}

  public execute(currentFen: string | undefined | null): LineHistoryNavigationResult {
    const fallbackResult: LineHistoryNavigationResult = {
      canGoPrevious: false,
      canGoNext: false,
      previousFen: null,
      nextFen: null
    };

    if (!currentFen) {
      return fallbackResult;
    }

    const historyRes = this.lineHistoryPort.loadHistory();
    if (historyRes.isFailure()) {
      return fallbackResult;
    }

    const history = historyRes.unwrap();
    const index = history.findIndex(item => item.fen === currentFen);

    if (index === -1) {
      return fallbackResult;
    }

    const canGoPrevious = index > 0;
    const canGoNext = index < history.length - 1;

    const previousFen = canGoPrevious ? history[index - 1].fen : null;
    const nextFen = canGoNext ? history[index + 1].fen : null;

    return {
      canGoPrevious,
      canGoNext,
      previousFen,
      nextFen
    };
  }

  /**
   * 세션 수순 중간 분기일 시, 해당 이전 국면 이후의 기보들을 잘라내고 새 국면을 추가하는 공통 정책
   */
  public truncateAndInsert(
    history: LineHistoryItem[],
    newFen: string,
    moveSan: string,
    from?: string | null,
    to?: string | null,
    previousFen?: string | null
  ): LineHistoryItem[] {
    let result = [...history];

    if (previousFen) {
      const index = result.findIndex(item => item.fen === previousFen);
      if (index !== -1) {
        result = result.slice(0, index + 1);
      }
    }

    if (result.length === 0 && previousFen) {
      result.push({ fen: previousFen, moveSan: null });
    }

    result.push({ fen: newFen, moveSan, from, to });
    return result;
  }
}

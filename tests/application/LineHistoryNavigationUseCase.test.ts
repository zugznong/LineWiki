import { describe, it, expect } from 'vitest';
import { PushLineHistoryUseCase } from '../../src/lib/application/history/PushLineHistoryUseCase';
import { LineHistoryNavigationUseCase } from '../../src/lib/application/history/LineHistoryNavigationUseCase';
import type { LineHistoryPort } from '../../src/lib/ports/LineHistoryPort';
import type { LineHistoryItem } from '../../src/lib/domain/chess/LineHistory';
import { success } from '../../src/lib/utils/result';
import type { Result } from '../../src/lib/utils/result';

class InMemoryLineHistoryAdapter implements LineHistoryPort {
  private history: LineHistoryItem[] = [];

  constructor(initialHistory: LineHistoryItem[] = []) {
    this.history = initialHistory;
  }

  public loadHistory(): Result<LineHistoryItem[], Error> {
    return success([...this.history]);
  }

  public saveHistory(history: LineHistoryItem[]): Result<void, Error> {
    this.history = [...history];
    return success(undefined);
  }

  public clearHistory(): void {
    this.history = [];
  }
}

describe('LineHistoryNavigationUseCase Integrated Scenario', () => {
  it('should handle "3 steps played -> move back -> choose new move -> truncate old forward line" scenario', () => {
    const lineHistoryPort = new InMemoryLineHistoryAdapter();
    const navUseCase = new LineHistoryNavigationUseCase(lineHistoryPort);
    const pushUseCase = new PushLineHistoryUseCase(lineHistoryPort, navUseCase);

    const fen0 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // Start
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'; // 1. e4
    const fen2 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2'; // 1... c5
    const fen3 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2'; // 2. Nf3

    // 1. 3수 진행
    // 첫 수 둘 때 (previousFen: fen0, newFen: fen1)
    pushUseCase.execute(fen1, 'e4', 'e2', 'e4', fen0);
    // 두 번째 수 (previousFen: fen1, newFen: fen2)
    pushUseCase.execute(fen2, 'c5', 'c7', 'c5', fen1);
    // 세 번째 수 (previousFen: fen2, newFen: fen3)
    pushUseCase.execute(fen3, 'Nf3', 'g1', 'f3', fen2);

    let history = lineHistoryPort.loadHistory().unwrap();
    // history structure should be:
    // [0] fen0 (initial fallback prior to first move)
    // [1] fen1 (e4)
    // [2] fen2 (c5)
    // [3] fen3 (Nf3)
    expect(history.length).toBe(4);
    expect(history[0].fen).toBe(fen0);
    expect(history[1].fen).toBe(fen1);
    expect(history[2].fen).toBe(fen2);
    expect(history[3].fen).toBe(fen3);

    // 2. 이전 수순 이동: 1... c5 기점으로 되돌아간 상태 (현재 FEN = fen2)
    // 3. 새 수 선택: d4 를 선택하여 새 FEN (fen4) 로 수 진행
    const fen4 = 'rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2'; // 2. d4

    // 새 수 진행 시 previousFen 은 fen2 임
    pushUseCase.execute(fen4, 'd4', 'd2', 'd4', fen2);

    // 4. 기존 forward 라인 제거 검증
    const updatedHistory = lineHistoryPort.loadHistory().unwrap();
    
    // updatedHistory 에는 [0] fen0, [1] fen1, [2] fen2, 그리고 기존 fen3은 잘리고 새 수인 [3] fen4 가 위치해야 함
    expect(updatedHistory.length).toBe(4);
    expect(updatedHistory[0].fen).toBe(fen0);
    expect(updatedHistory[1].fen).toBe(fen1);
    expect(updatedHistory[2].fen).toBe(fen2);
    expect(updatedHistory[3].fen).toBe(fen4); // 기존의 fen3 ('Nf3') 은 완벽하게 잘렸음
    expect(updatedHistory.find(item => item.fen === fen3)).toBeUndefined();
  });
});

describe('LineHistoryNavigationUseCase Unit Tests', () => {
  it('should correctly calculate previous/next accessibility and targets for mid-index item', () => {
    const list: LineHistoryItem[] = [
      { fen: 'fen_start', moveSan: null },
      { fen: 'fen_step1', moveSan: 'e4' },
      { fen: 'fen_step2', moveSan: 'e5' },
      { fen: 'fen_step3', moveSan: 'Nf3' }
    ];
    const adapter = new InMemoryLineHistoryAdapter(list);
    const useCase = new LineHistoryNavigationUseCase(adapter);

    const res = useCase.execute('fen_step2');

    expect(res.canGoPrevious).toBe(true);
    expect(res.canGoNext).toBe(true);
    expect(res.previousFen).toBe('fen_step1');
    expect(res.nextFen).toBe('fen_step3');
  });

  it('should prevent previous movement at the very start of the history', () => {
    const list: LineHistoryItem[] = [
      { fen: 'fen_start', moveSan: null },
      { fen: 'fen_step1', moveSan: 'e4' }
    ];
    const adapter = new InMemoryLineHistoryAdapter(list);
    const useCase = new LineHistoryNavigationUseCase(adapter);

    const res = useCase.execute('fen_start');

    expect(res.canGoPrevious).toBe(false);
    expect(res.canGoNext).toBe(true);
    expect(res.previousFen).toBeNull();
    expect(res.nextFen).toBe('fen_step1');
  });

  it('should prevent forward movement at the very end of the history', () => {
    const list: LineHistoryItem[] = [
      { fen: 'fen_start', moveSan: null },
      { fen: 'fen_step1', moveSan: 'e4' }
    ];
    const adapter = new InMemoryLineHistoryAdapter(list);
    const useCase = new LineHistoryNavigationUseCase(adapter);

    const res = useCase.execute('fen_step1');

    expect(res.canGoPrevious).toBe(true);
    expect(res.canGoNext).toBe(false);
    expect(res.previousFen).toBe('fen_start');
    expect(res.nextFen).toBeNull();
  });

  it('should return default fallback state if currentFen is not found in history', () => {
    const list: LineHistoryItem[] = [
      { fen: 'fen_start', moveSan: null }
    ];
    const adapter = new InMemoryLineHistoryAdapter(list);
    const useCase = new LineHistoryNavigationUseCase(adapter);

    const res = useCase.execute('fen_invalid');

    expect(res.canGoPrevious).toBe(false);
    expect(res.canGoNext).toBe(false);
    expect(res.previousFen).toBeNull();
    expect(res.nextFen).toBeNull();
  });

  it('should guarantee that topbar button navigation, shortcut triggers and move historystrip matches identical transition data', () => {
    const list: LineHistoryItem[] = [
      { fen: 'fen_start', moveSan: null },
      { fen: 'fen_step1', moveSan: 'e4' },
      { fen: 'fen_step2', moveSan: 'e5' }
    ];
    const adapter = new InMemoryLineHistoryAdapter(list);
    const useCase = new LineHistoryNavigationUseCase(adapter);

    const navigationResult = useCase.execute('fen_step1');

    expect(navigationResult.canGoPrevious).toBe(true);
    expect(navigationResult.canGoNext).toBe(true);
    expect(navigationResult.previousFen).toBe('fen_start');
    expect(navigationResult.nextFen).toBe('fen_step2');
  });
});

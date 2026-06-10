import { describe, it, expect, vi } from 'vitest';
import { NavigateMoveUseCase } from '../../src/lib/application/chess/NavigateMoveUseCase';
import { ChessJsEngineAdapter } from '../../src/lib/adapters/chess/ChessJsEngineAdapter';
import { StartLineSessionUseCase } from '../../src/lib/application/history/StartLineSessionUseCase';
import { PushLineHistoryUseCase } from '../../src/lib/application/history/PushLineHistoryUseCase';
import { LineHistoryNavigationUseCase } from '../../src/lib/application/history/LineHistoryNavigationUseCase';
import type { LineHistoryPort } from '../../src/lib/ports/LineHistoryPort';
import type { LineSessionPort } from '../../src/lib/ports/LineSessionPort';
import type { LineHistoryItem } from '../../src/lib/domain/chess/LineHistory';
import { success, type Result } from '../../src/lib/utils/result';
import { Fen } from '../../src/lib/domain/chess/Fen';

class InMemoryLineHistoryPort implements LineHistoryPort {
  private historyList: LineHistoryItem[] = [];

  public loadHistory(): Result<LineHistoryItem[], Error> {
    return success(this.historyList);
  }

  public saveHistory(history: LineHistoryItem[]): Result<void, Error> {
    this.historyList = [...history];
    return success(undefined);
  }

  public clearHistory(): void {
    this.historyList = [];
  }
}

class InMemoryLineSessionPort implements LineSessionPort {
  private startedFromApp = false;

  public isStartedFromApp(): boolean {
    return this.startedFromApp;
  }

  public setStartedFromApp(val: boolean): void {
    this.startedFromApp = val;
  }

  public clearSessionMarker(): void {
    this.startedFromApp = false;
  }
}

describe('SharedLinkLineSession Integration Flow Tests', () => {
  it('should support full cycle: ingress from shared link, making a move, session promotion, history persistence, and move navigation check', () => {
    // 1. Setup in-memory adapters mimicking browser storage
    const lineHistoryPort = new InMemoryLineHistoryPort();
    const lineSessionPort = new InMemoryLineSessionPort();

    // 2. Validate clean starting state from shared link (isStartedFromApp starts as false)
    expect(lineSessionPort.isStartedFromApp()).toBe(false);
    expect(lineHistoryPort.loadHistory().unwrap()).toEqual([]);

    // 3. Compose real use cases using ports
    const startLineSessionUseCase = new StartLineSessionUseCase(lineSessionPort);
    const lineHistoryNavigationUseCase = new LineHistoryNavigationUseCase(lineHistoryPort);
    const pushLineHistoryUseCase = new PushLineHistoryUseCase(lineHistoryPort, lineHistoryNavigationUseCase);

    const mockNavigation = {
      goto: vi.fn()
    };

    const chessEngine = new ChessJsEngineAdapter();

    const navigateMoveUseCase = new NavigateMoveUseCase(
      mockNavigation,
      pushLineHistoryUseCase,
      startLineSessionUseCase,
      chessEngine
    );

    // 4. Define standard chess starting FEN and first move FEN (e4)
    const previousFen = Fen.START_POSITION;
    const nextFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    
    const playedMove = {
      previousFen,
      nextFen,
      san: 'e4',
      from: 'e2',
      to: 'e4'
    };

    // 5. Execute move play
    navigateMoveUseCase.execute(playedMove);

    // 6. Verify that the startedFromApp session marker promoted to true
    expect(lineSessionPort.isStartedFromApp()).toBe(true);

    // 7. Verify routing navigation was invoked
    expect(mockNavigation.goto).toHaveBeenCalled();

    // 8. Verify line history was correctly persisted (storing previous layout and the new played layout)
    const history = lineHistoryPort.loadHistory().unwrap();
    expect(history.length).toBe(2);
    expect(history[0].fen).toBe(previousFen);
    expect(history[0].moveSan).toBeNull();
    expect(history[1].fen).toBe(nextFen);
    expect(history[1].moveSan).toBe('e4');
    expect(history[1].from).toBe('e2');
    expect(history[1].to).toBe('e4');

    // 9. Execute line navigation check for standard and current positions
    const initialNavResult = lineHistoryNavigationUseCase.execute(previousFen);
    expect(initialNavResult.canGoPrevious).toBe(false);
    expect(initialNavResult.canGoNext).toBe(true);
    expect(initialNavResult.previousFen).toBeNull();
    expect(initialNavResult.nextFen).toBe(nextFen);

    const playedNavResult = lineHistoryNavigationUseCase.execute(nextFen);
    expect(playedNavResult.canGoPrevious).toBe(true);
    expect(playedNavResult.canGoNext).toBe(false);
    expect(playedNavResult.previousFen).toBe(previousFen);
    expect(playedNavResult.nextFen).toBeNull();
  });
});


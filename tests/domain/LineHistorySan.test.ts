import { describe, it, expect } from 'vitest';
import type { LineHistoryItem } from '../../src/lib/domain/chess/LineHistory';
import type { LineHistoryPort } from '../../src/lib/ports/LineHistoryPort';
import { success, type Result } from '../../src/lib/utils/result';

class MockSessionHistoryPort implements LineHistoryPort {
  private items: LineHistoryItem[] = [];

  public loadHistory(): Result<LineHistoryItem[], Error> {
    return success(this.items);
  }

  public saveHistory(history: LineHistoryItem[]): Result<void, Error> {
    this.items = [...history];
    return success(undefined);
  }

  public clearHistory(): void {
    this.items = [];
  }
}

describe('LineHistory SAN Persistence & Restoration Tests', () => {
  it('should successfully store and restore diverse standard SAN expressions representing normal moves, captures, castling, promotions, check, and checkmates', () => {
    const port = new MockSessionHistoryPort();

    // 1. Prepare diverse historical moves representing unique SAN features
    const initialHistory: LineHistoryItem[] = [
      {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moveSan: null,
        from: null,
        to: null
      },
      {
        // Normal Move (e4)
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        moveSan: 'e4',
        from: 'e2',
        to: 'e4'
      },
      {
        // Capture (exd5)
        fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2',
        moveSan: 'exd5',
        from: 'e4',
        to: 'd5'
      },
      {
        // Castling (O-O)
        fen: 'rnbqk2r/pppp1ppp/5n2/4p3/1b2P3/3P1N2/PPPB1PPP/RN1QKB1R b KQkq - 2 4',
        moveSan: 'O-O',
        from: 'e8',
        to: 'g8'
      },
      {
        // Promotion (a8=Q)
        fen: 'Qnbqkbnr/1ppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR b KQk - 0 5',
        moveSan: 'a8=Q',
        from: 'a7',
        to: 'a8'
      },
      {
        // Check (Qh5+)
        fen: 'rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
        moveSan: 'Qh5+',
        from: 'd1',
        to: 'h5'
      },
      {
        // Checkmate (Qxf7#)
        fen: 'rnbqkbnr/pppppQpp/8/8/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3',
        moveSan: 'Qxf7#',
        from: 'h5',
        to: 'f7'
      }
    ];

    // 2. Persist records to the session storage port adapter
    const saveRes = port.saveHistory(initialHistory);
    expect(saveRes.isOk()).toBe(true);

    // 3. Restore records from the session storage port adapter
    const loadRes = port.loadHistory();
    expect(loadRes.isOk()).toBe(true);

    const restoredHistory = loadRes.unwrap();
    expect(restoredHistory).toHaveLength(7);

    // 4. Validate exact restoration of SAN characteristics
    // Complete validation on starting position (SAN: null)
    expect(restoredHistory[0].moveSan).toBeNull();
    expect(restoredHistory[0].from).toBeNull();

    // Validate a typical pawn normal push
    expect(restoredHistory[1].moveSan).toBe('e4');
    expect(restoredHistory[1].from).toBe('e2');
    expect(restoredHistory[1].to).toBe('e4');

    // Validate pawn capturing pawn action
    expect(restoredHistory[2].moveSan).toBe('exd5');
    expect(restoredHistory[2].from).toBe('e4');
    expect(restoredHistory[2].to).toBe('d5');

    // Validate King-side castling expression
    expect(restoredHistory[3].moveSan).toBe('O-O');
    expect(restoredHistory[3].from).toBe('e8');
    expect(restoredHistory[3].to).toBe('g8');

    // Validate Pawn promotion to Queen
    expect(restoredHistory[4].moveSan).toBe('a8=Q');
    expect(restoredHistory[4].from).toBe('a7');
    expect(restoredHistory[4].to).toBe('a8');

    // Validate Queen attacking King (Check +)
    expect(restoredHistory[5].moveSan).toBe('Qh5+');
    expect(restoredHistory[5].from).toBe('d1');
    expect(restoredHistory[5].to).toBe('h5');

    // Validate fatal blow on f7 (Checkmate #)
    expect(restoredHistory[6].moveSan).toBe('Qxf7#');
    expect(restoredHistory[6].from).toBe('h5');
    expect(restoredHistory[6].to).toBe('f7');
  });
});

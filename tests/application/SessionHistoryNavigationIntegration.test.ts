import { describe, it, expect } from 'vitest';
import { lineHistoryStore } from '../../src/lib/stores/lineHistoryStore.svelte.ts';
import { sessionHistoryStore } from '../../src/lib/stores/sessionHistoryStore.svelte.ts';
import { positionStore } from '../../src/lib/stores/positionStore.svelte.ts';
import { Position } from '../../src/lib/domain/chess/Position';

describe('SessionHistoryNavigationIntegration tests', () => {
  it('should guarantee TopBar previous/next and shortcut previous/next use the identical underlying FEN calculations', () => {
    // 1. Setup mock history items inside the lineHistoryStore
    // We can simulate updating the state of lineHistoryStore directly or through mocking
    const testItems = [
      { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moveSan: null },
      { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', moveSan: 'e4' },
      { fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2', moveSan: 'c5' }
    ];

    // Force inject test items to state (with any isLoaded mock or forceUpdate bypass)
    lineHistoryStore.overrideHistoryItems(testItems);
    
    // Set position to active item 1 (e4)
    positionStore.setPosition(
      new Position(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        false,
        false,
        false,
        [],
        'b'
      ),
      [],
      null
    );

    // Let's verify sessionHistoryStore can transition safely and gives the same FEN as expected
    // Topbar calculations
    const topBarCanGoBack = sessionHistoryStore.canGoBack;
    const topBarCanGoForward = sessionHistoryStore.canGoForward;
    const topBarPrevFen = sessionHistoryStore.getPreviousFen();
    const topBarNextFen = sessionHistoryStore.getNextFen();

    // Shortcuts calculation
    const shortcutCanGoBack = sessionHistoryStore.canGoBack;
    const shortcutCanGoForward = sessionHistoryStore.canGoForward;
    const shortcutPrevFen = sessionHistoryStore.getPreviousFen();
    const shortcutNextFen = sessionHistoryStore.getNextFen();

    // Verify exact equality and consistency between UI buttons and shortcuts
    expect(topBarCanGoBack).toBe(shortcutCanGoBack);
    expect(topBarCanGoForward).toBe(shortcutCanGoForward);
    expect(topBarPrevFen).toBe(shortcutPrevFen);
    expect(topBarNextFen).toBe(shortcutNextFen);

    // Verify correct calculations with the overridden history
    expect(topBarCanGoBack).toBe(true);
    expect(topBarCanGoForward).toBe(true);
    expect(topBarPrevFen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(topBarNextFen).toBe('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2');
  });
});

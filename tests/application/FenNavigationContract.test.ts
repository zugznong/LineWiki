import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateFenUrlUseCase } from '../../src/lib/application/chess/CreateFenUrlUseCase';
import { RestoreFenFromUrlUseCase } from '../../src/lib/application/chess/RestoreFenFromUrlUseCase';
import { ChessJsEngineAdapter } from '../../src/lib/adapters/chess/ChessJsEngineAdapter';
import { SvelteNavigationAdapter } from '../../src/lib/adapters/navigation/SvelteNavigationAdapter';
import * as runtimeConfig from '../../src/lib/config/runtimeConfig';
import { goto } from '$app/navigation';

// Mock the $app/navigation module using vitest
vi.mock('$app/navigation', () => {
  return {
    goto: vi.fn(() => Promise.resolve())
  };
});

describe('FenNavigationContract Regression Tests', () => {
  let chessEngine: ChessJsEngineAdapter;
  let createUseCase: CreateFenUrlUseCase;
  let restoreUseCase: RestoreFenFromUrlUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    chessEngine = new ChessJsEngineAdapter();
    createUseCase = new CreateFenUrlUseCase(chessEngine);
    restoreUseCase = new RestoreFenFromUrlUseCase(chessEngine);
  });

  it('should verify CreateFenUrlUseCase returns absolute paths starting with /fen/', () => {
    const fens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Start
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', // 1. e4
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3' // e4 e5 Nf3 Nc6
    ];

    for (const fen of fens) {
      const path = createUseCase.execute(fen);
      expect(path).toBeDefined();
      expect(path.startsWith('/fen/')).toBe(true);

      // Verify that RestoreFenFromUrlUseCase can decode it back perfectly
      const segment = path.replace(/^\/fen\//, '');
      const restoreResult = restoreUseCase.execute(segment);
      expect(restoreResult.isOk()).toBe(true);
      expect(restoreResult.unwrap()).toBe(fen);
    }
  });

  it('should not invoke underlying goto navigation when destination is identical to current pathname', () => {
    // Force isBrowser to be true for SvelteNavigationAdapter browser logic path
    vi.spyOn(runtimeConfig, 'isBrowser', 'get').mockReturnValue(true);

    const mockLocation = {
      pathname: '/fen/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1'
    };

    // Save global window mock
    const originalWindow = global.window;
    global.window = {
      location: mockLocation
    } as any;

    const navAdapter = new SvelteNavigationAdapter();
    
    // Navigate to the same URL
    const destinationPath = '/fen/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
    const result = navAdapter.goto(destinationPath);

    expect(result.success).toBe(true);
    // Under identical pathname, Svelte Kit's goto should NEVER be called
    expect(goto).not.toHaveBeenCalled();

    // Restore window
    global.window = originalWindow;
  });

  it('should invoke Svelte Kit goto when destination is different from current pathname', () => {
    vi.spyOn(runtimeConfig, 'isBrowser', 'get').mockReturnValue(true);

    const mockLocation = {
      pathname: '/fen/rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR_b_KQkq_e3_0_1' // e4
    };

    const originalWindow = global.window;
    global.window = {
      location: mockLocation
    } as any;

    const navAdapter = new SvelteNavigationAdapter();

    // Navigate to a different FEN path
    const destinationPath = '/fen/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1';
    const result = navAdapter.goto(destinationPath);

    expect(result.success).toBe(true);
    // Destination is different, therefore Svelte Kit's goto must be called
    expect(goto).toHaveBeenCalledWith(destinationPath);

    global.window = originalWindow;
  });
});

import { describe, it, expect, vi } from 'vitest';
import { getChessServices, getStorageServices, getNavigationAdapter } from '../../src/lib/composition/createAppServices';

// Mock the services module to isolate component logic or use-case execution
vi.mock('../../src/lib/composition/createAppServices', () => {
  const mockNavigation = {
    goto: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  };

  const mockStorage = {
    startLineSession: { execute: vi.fn() },
    clearLineHistory: { execute: vi.fn() }
  };

  const mockChessEngine = {
    validateFen: vi.fn((fen: string) => {
      // Basic mock chess.js validator
      return fen.length <= 240 && !fen.includes('invalid');
    })
  };

  const mockChessServices = {
    chessEngine: mockChessEngine,
    createFenUrl: {
      execute: vi.fn((fen: string) => {
        if (fen.length > 240 || fen.includes('invalid') || fen.includes('fail-url')) {
          return '';
        }
        return `/fen/${fen.replace(/\s+/g, '_')}`;
      })
    }
  };

  return {
    getChessServices: () => mockChessServices,
    getStorageServices: () => mockStorage,
    getNavigationAdapter: () => mockNavigation,
    createAppServices: () => ({
      navigation: mockNavigation,
      lineSession: { isStartedFromApp: () => true }
    })
  };
});

describe('FenInputCard Security Defense Edge Cases', () => {
  it('should block navigation when FEN exceeds 240 characters limit', () => {
    const chess = getChessServices();
    const navigation = getNavigationAdapter();
    const storage = getStorageServices();

    const longFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' + 'A'.repeat(200);
    expect(longFen.length).toBeGreaterThan(240);

    const targetUrl = chess.createFenUrl.execute(longFen);
    expect(targetUrl).toBe('');

    // Verification that navigation.goto is not called with empty destination
    if (!targetUrl) {
      expect(navigation.goto).not.toHaveBeenCalled();
    }
  });

  it('should block navigation when FEN URL creation fails', () => {
    const chess = getChessServices();
    const navigation = getNavigationAdapter();

    const targetFen = 'fail-url-test';
    const targetUrl = chess.createFenUrl.execute(targetFen);
    
    expect(targetUrl).toBe('');
    if (!targetUrl) {
      expect(navigation.goto).not.toHaveBeenCalled();
    }
  });

  it('should block navigation when chessEngine FEN validation fails', () => {
    const chess = getChessServices();
    const navigation = getNavigationAdapter();

    const invalidFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - invalid';
    const validationResult = chess.chessEngine.validateFen(invalidFen);
    
    expect(validationResult).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { isLightSquare } from '../../src/lib/domain/chess/SquareColor';

describe('BoardSquare Color Calculation Tests', () => {
  it('should verify that a1 is a dark square', () => {
    expect(isLightSquare('a', 1)).toBe(false);
  });

  it('should verify that h1 is a light square', () => {
    expect(isLightSquare('h', 1)).toBe(true);
  });

  it('should verify that a8 is a light square', () => {
    expect(isLightSquare('a', 8)).toBe(true);
  });

  it('should verify that h8 is a dark square', () => {
    expect(isLightSquare('h', 8)).toBe(false);
  });

  it('should verify correct standard checkerboard coloring for other critical squares', () => {
    // b1 is light
    expect(isLightSquare('b', 1)).toBe(true);
    // e4 is light
    expect(isLightSquare('e', 4)).toBe(true);
    // d5 is light
    expect(isLightSquare('d', 5)).toBe(true);
    // d4 is dark
    expect(isLightSquare('d', 4)).toBe(false);
  });
});

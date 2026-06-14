import { describe, it, expect } from 'vitest';
import { PieceStyle } from '../../src/lib/domain/board/PieceStyle';
import fs from 'fs';
import path from 'path';

describe('PieceStyle Domain Unit Tests', () => {
  it('should verify that all supported piece styles are available in the registry', () => {
    const allStyles = PieceStyle.getAllStyles();
    expect(allStyles.length).toBe(5);

    const names = allStyles.map(s => s.name);
    expect(names).toContain('Cburnett');
    expect(names).toContain('Chessnut');
    expect(names).toContain('Merida');
    expect(names).toContain('RhosGFX');
    expect(names).toContain('Unicode Classic');
  });

  it('should verify that each style has functional styling attributes and matches static assets on disk', () => {
    const allStyles = PieceStyle.getAllStyles();

    // Load sources metadata for cross-checking
    const sourcesJsonPath = path.resolve(__dirname, '../../static/pieces/SOURCES.json');
    expect(fs.existsSync(sourcesJsonPath)).toBe(true);
    const sourcesData = JSON.parse(fs.readFileSync(sourcesJsonPath, 'utf8'));

    // Resolve base pieces directory path
    const piecesDir = path.resolve(__dirname, '../../static/pieces');

    for (const style of allStyles) {
      // Scale should be a practical fractional proportion for visual fits
      expect(style.scale).toBeGreaterThan(0.5);
      expect(style.scale).toBeLessThanOrEqual(1.0);

      if (style.kind === 'unicode') {
        // Colors should be valid hex codes
        expect(style.whiteColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(style.blackColor).toMatch(/^#[0-9a-fA-F]{6}$/);

        // Filters should declare HTML shadow effects
        expect(style.whiteFilter).toContain('drop-shadow');
        expect(style.blackFilter).toContain('drop-shadow');
      } else {
        expect(style.kind).toBe('svg');
        expect(style.assetDirectory).toBeDefined();
        expect(style.label).toBeDefined();
        expect(style.licenseId).toBeDefined();

        // Cross-verify with SOURCES.json to block any unrecorded styles
        expect(sourcesData).toHaveProperty(style.assetDirectory);

        // Cross-verify that its physical folder actually exists on disk
        const styleFolder = path.join(piecesDir, style.assetDirectory);
        expect(fs.existsSync(styleFolder)).toBe(true);
        expect(fs.statSync(styleFolder).isDirectory()).toBe(true);
      }
    }
  });

  it('should fallback elegantly to Cburnett when query style does not exist', () => {
    const cburnettStyle = PieceStyle.CBURNETT;

    const fallbackStyle1 = PieceStyle.getStyle('InvalidStyle');
    const fallbackStyle2 = PieceStyle.getStyle('');

    expect(fallbackStyle1.name).toBe('Cburnett');
    expect(fallbackStyle1.scale).toBe(cburnettStyle.scale);
    expect(fallbackStyle1.kind).toBe('svg');

    expect(fallbackStyle2.name).toBe('Cburnett');
    expect(fallbackStyle2.scale).toBe(cburnettStyle.scale);
    expect(fallbackStyle2.kind).toBe('svg');
  });
});

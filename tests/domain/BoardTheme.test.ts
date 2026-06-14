import { describe, it, expect } from 'vitest';
import { BoardTheme } from '../../src/lib/domain/board/BoardTheme';

describe('BoardTheme Domain Unit Tests', () => {
  it('should verify that all supported themes exist in the registry', () => {
    const allThemes = BoardTheme.getAllThemes();
    expect(allThemes.length).toBe(3);

    const names = allThemes.map(t => t.name);
    expect(names).toContain('Classic Green');
    expect(names).toContain('Walnut');
    expect(names).toContain('Slate');
  });

  it('should verify that different themes return different light/dark colors', () => {
    const classicColors = BoardTheme.getTheme('Classic Green');
    const walnutColors = BoardTheme.getTheme('Walnut');
    const slateColors = BoardTheme.getTheme('Slate');

    // Confirm light color difference
    expect(classicColors.light).not.toBe(walnutColors.light);
    expect(classicColors.light).not.toBe(slateColors.light);
    expect(walnutColors.light).not.toBe(slateColors.light);

    // Confirm dark color difference
    expect(classicColors.dark).not.toBe(walnutColors.dark);
    expect(classicColors.dark).not.toBe(slateColors.dark);
    expect(walnutColors.dark).not.toBe(slateColors.dark);
  });

  it('should verify that invalid theme names fallback gracefully to Classic Green colors', () => {
    const classicColors = BoardTheme.getTheme('Classic Green');
    
    // Pass non-existent themes (cast to ThemeName to bypass type check under test)
    const fallbackColors1 = BoardTheme.getTheme('UnknownThemeName' as any);
    const fallbackColors2 = BoardTheme.getTheme('' as any);

    expect(fallbackColors1.name).toBe('Classic Green');
    expect(fallbackColors1.light).toBe(classicColors.light);
    expect(fallbackColors1.dark).toBe(classicColors.dark);

    expect(fallbackColors2.name).toBe('Classic Green');
    expect(fallbackColors2.light).toBe(classicColors.light);
    expect(fallbackColors2.dark).toBe(classicColors.dark);
  });
});

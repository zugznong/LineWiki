import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('UI Theme Color Tokens Regression Test Suite', () => {
  it('should verify that all core warm-dark background tokens exist and --color-bg-base is updated', () => {
    const colorsPath = path.resolve('src/lib/styles/tokens/colors.css');
    expect(fs.existsSync(colorsPath)).toBe(true);

    const content = fs.readFileSync(colorsPath, 'utf-8');

    // 1. Verify existence of core colors tokens
    expect(content).toContain('--color-bg-base:');
    expect(content).toContain('--color-bg-surface:');
    expect(content).toContain('--color-bg-panel:');
    expect(content).toContain('--color-bg-card:');
    expect(content).toContain('--color-bg-nested:');

    // 2. Extracted variables evaluation
    const baseMatch = content.match(/--color-bg-base:\s*([^;]+);/);
    expect(baseMatch).not.toBeNull();
    
    if (baseMatch) {
      const baseValue = baseMatch[1].trim();
      // Ensure the base color has changed from the old pure dark slate slate-950/indigo (#020617)
      expect(baseValue).not.toBe('#020617');
      
      // Optionally expect a warm-dark shade (such as Chess.com style warm brown #312e2b)
      expect(baseValue).toBe('#312e2b');
    }
  });
});

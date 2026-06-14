import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Vite Configuration Asset Generation Regression Test', () => {
  it('should ensure vite.config.ts contains no automatic asset generation or self-healing helper code', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, 'utf8');

    // These patterns shouldn't return or be invoked within vite.config.ts for chess pieces
    expect(configContent).not.toContain('generatePiecesAssets');
    expect(configContent).not.toContain('static/pieces');
    expect(configContent).not.toContain('writeFileSync');
  });
});

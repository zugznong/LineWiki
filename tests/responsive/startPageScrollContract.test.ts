import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Start Page Scroll Contract Tests', () => {
  it('should verify StartPageShell.svelte root container has scrollability classes', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/start/StartPageShell.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. check for scrollability class (now using body scroll, so layout overflow-visible)
    expect(content).toContain('overflow-visible');
    expect(content).toContain('min-h-dvh');
    expect(content).toContain('id="start-page-shell"');
  });

  it('should verify start-page.css root selector declares min-height and overflow-y: auto', () => {
    const cssPath = path.resolve(process.cwd(), 'src/lib/styles/features/start-page.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    // 1. check #start-page-shell properties (now using body scroll, so visible layout)
    expect(content).toContain('#start-page-shell');
    expect(content).toContain('min-height: 100dvh');
    expect(content).toContain('overflow: visible');
  });
});

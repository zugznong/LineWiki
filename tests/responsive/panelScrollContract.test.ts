import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Panel Scroll Contract Tests', () => {
  it('should verify SettingsPanel.svelte root element attributes and routing', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/panels/SettingsPanel.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="settings-panel"');
    expect(content).toContain('min-h-0');
    expect(content).toContain('h-full');
    expect(content).toContain('max-h-full');
    expect(content).toContain('overflow-y-auto');
  });

  it('should verify BottomPanel.svelte container has height and scroll mitigation classes', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/panels/BottomPanel.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="bottom-panel-container"');
    expect(content).toContain('min-h-0');
    expect(content).toContain('h-full');
    expect(content).toContain('max-h-full');
  });

  it('should verify CandidateMoveList.svelte has proper flexible overflow limits', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/moves/CandidateMoveList.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="candidate-move-container"');
    expect(content).toContain('h-full');
    expect(content).toContain('min-h-0');
    expect(content).toContain('max-h-full');
    expect(content).toContain('overflow-hidden');
  });

  it('should verify CSS styles define absolute scroll boundary properties for settings panel', () => {
    const panelsCssPath = path.resolve(process.cwd(), 'src/lib/styles/features/panels.css');
    const panelsCss = fs.readFileSync(panelsCssPath, 'utf-8');

    expect(panelsCss).toContain('#settings-panel');
    expect(panelsCss).toContain('min-height: 0;');
    expect(panelsCss).toContain('max-height: 100%;');
    expect(panelsCss).toContain('overflow-y: auto;');
  });

  it('should verify SidePanel.svelte has #side-panel-content and that it does not use overflow-y-auto directly', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/panels/SidePanel.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="side-panel-content"');
    expect(content).toContain('overflow-hidden');
    expect(content).not.toContain('id="side-panel-content" class="flex-1 overflow-y-auto');
  });

  it('should verify EnginePanel.svelte root has id="engine-panel" with h-full, min-h-0, and overflow-hidden or flex-1', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/panels/EnginePanel.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="engine-panel"');
    expect(content).toContain('h-full');
    expect(content).toContain('min-h-0');
    expect(content).toContain('overflow-hidden');
  });
});

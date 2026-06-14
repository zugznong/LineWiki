import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('BoardPiece Asset Fallback and Style Transition Static Contract Tests', () => {
  const componentPath = path.resolve(process.cwd(), 'src/lib/components/board/BoardPiece.svelte');
  const content = fs.readFileSync(componentPath, 'utf-8');

  it('should implement status-driven failedSvgSrc state instead of legacy fallbackStyleOverride', () => {
    // 1. Should NOT contain legacy fallbackStyleOverride variable or assignments
    expect(content).not.toContain('fallbackStyleOverride');

    // 2. Should contain stateful failedSvgSrc to granularly track failed img sources
    expect(content).toContain('failedSvgSrc = $state<string>(\'\')');
  });

  it('should verify automatic SVG recovery when styleName or pack is changed', () => {
    // 1. isFallback must only be active when failedSvgSrc matches current active svgSrc or renders a decoupled error
    expect(content).toContain('isFallback = $derived(activeStyle.kind === \'svg\' && (failedSvgSrc === svgSrc || hasRenderError))');

    // 2. Custom renderStyle derivation should resolve fallback safely
    expect(content).toContain('renderStyle = $derived(isFallback ? PieceStyle.CLASSIC : activeStyle)');
  });

  it('should verify same-URL fallback state keeps static without causing render loop disasters', () => {
    // 1. handleImageError must bind the failing svgSrc to block infinite re-triggering of onerror
    expect(content).toContain('function handleImageError() {');
    expect(content).toContain('failedSvgSrc = svgSrc;');

    // 2. Custom style dimensions should adhere to renderStyle instead of global overriding styles
    expect(content).toContain('renderStyle.kind === \'unicode\'');
    expect(content).toContain('color === \'w\' ? renderStyle.whiteColor');
  });
});

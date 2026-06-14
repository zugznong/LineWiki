import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { viewportStore } from '$lib/stores/viewportStore.svelte';

describe('Desktop Layout and UI Placement Contract Tests', () => {
  it('should verify PositionMainArea.svelte contains standard 3-column IDs', () => {
    const sveltePath = path.resolve(process.cwd(), 'src/lib/components/position/PositionMainArea.svelte');
    const content = fs.readFileSync(sveltePath, 'utf-8');

    // Verify presence of the standard 3-column container ID
    expect(content).toContain('id="desktop-3-column-layout"');

    // Verify 3 separate column IDs exist
    expect(content).toContain('id="desktop-board-col"');
    expect(content).toContain('id="desktop-candidate-col"');
    expect(content).toContain('id="desktop-side-panel-col"');
  });

  it('should verify SettingsPanel is not directly imported or rendered near CandidateMoveList inside PositionMainArea.svelte', () => {
    const sveltePath = path.resolve(process.cwd(), 'src/lib/components/position/PositionMainArea.svelte');
    const content = fs.readFileSync(sveltePath, 'utf-8');

    // Verify SettingsPanel is not included or coupled directly in the Main Area
    expect(content).not.toContain('SettingsPanel');
    expect(content).not.toContain('<SettingsPanel');
  });

  it('should verify usesDesktopShell mapping holds true across standard UI benchmarks', () => {
    // Case 1: Standard Desktop Full width & height
    viewportStore.updateDimensions(1920, 1080);
    expect(viewportStore.layoutMode).toBe('desktop-wide');
    expect(viewportStore.usesDesktopShell).toBe(true);

    // Case 2: compactDesktop or lowHeightDesktop (narrow/short) should not force desktop shell unless wideShortHeight criteria is met
    viewportStore.updateDimensions(1024, 600);
    expect(viewportStore.layoutMode).toBe('compactDesktop');
    expect(viewportStore.usesDesktopShell).toBe(false);

    // Case 3: wideShortHeight layout mode should always use desktop shell
    viewportStore.updateDimensions(1440, 500);
    expect(viewportStore.layoutMode).toBe('wideShortHeight');
    expect(viewportStore.usesDesktopShell).toBe(true);

    // Case 4: extremeShortHeight (height < 420, width >= 1440, ratio >= 2) - should go into extremeShortHeight and use desktop shell
    viewportStore.updateDimensions(1920, 410);
    expect(viewportStore.layoutMode).toBe('extremeShortHeight');
    expect(viewportStore.usesDesktopShell).toBe(true);

    // Case 5: normal laptop slightly low height below 700 with sufficient width
    viewportStore.updateDimensions(1280, 680);
    expect(viewportStore.usesDesktopShell).toBe(false); // height below 700, width < 1440, ratio 1.88 (not wideShortHeight either)
  });

  it('should verify that standard and compact layouts define explicit board, candidate, and side-panel grid areas in desktop.css', () => {
    const cssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop.css');
    expect(fs.existsSync(cssPath)).toBe(true);
    const content = fs.readFileSync(cssPath, 'utf-8');

    // 1. check standard layout block
    const standardBlockRegex = /#desktop-3-column-layout\[data-layout-mode="standard"\]\s*\{([^]*?)\}/;
    const standardMatch = content.match(standardBlockRegex);
    expect(standardMatch).not.toBeNull();
    const standardBody = standardMatch![1];
    
    expect(standardBody).toContain('grid-template-areas');
    expect(standardBody).not.toContain('grid-template-areas: none');
    expect(standardBody).toContain('board');
    expect(standardBody).toContain('candidate');
    expect(standardBody).toContain('side-panel');

    // 2. check compact layout block
    const compactBlockRegex = /#desktop-3-column-layout\[data-layout-mode="compact"\]\s*\{([^]*?)\}/;
    const compactMatch = content.match(compactBlockRegex);
    expect(compactMatch).not.toBeNull();
    const compactBody = compactMatch![1];

    expect(compactBody).toContain('grid-template-areas');
    expect(compactBody).not.toContain('grid-template-areas: none');
    expect(compactBody).toContain('board');
    expect(compactBody).toContain('candidate');
    expect(compactBody).toContain('side-panel');

    // 3. check child grid-area mappings
    const boardColRegex = /#desktop-board-col\s*\{([^]*?)\}/;
    const boardColMatch = content.match(boardColRegex);
    expect(boardColMatch).not.toBeNull();
    expect(boardColMatch![1]).toContain('grid-area: board');

    const sidePanelColRegex = /#desktop-side-panel-col\s*\{([^]*?)\}/;
    const sidePanelColMatch = content.match(sidePanelColRegex);
    expect(sidePanelColMatch).not.toBeNull();
    expect(sidePanelColMatch![1]).toContain('grid-area: side-panel');

    const candidateColRegex = /#desktop-candidate-col\s*\{([^]*?)\}/;
    const candidateColMatch = content.match(candidateColRegex);
    expect(candidateColMatch).not.toBeNull();
    expect(candidateColMatch![1]).toContain('grid-area: candidate');
  });

  it('should verify that desktop 3-column layout uses parent height 100% instead of dvh calculations and PositionMainArea uses flex-1 min-h-0', () => {
    // 1. Check CSS height configuration of #desktop-3-column-layout in desktop.css
    const cssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop.css');
    expect(fs.existsSync(cssPath)).toBe(true);
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const layoutBlockRegex = /#desktop-3-column-layout\s*\{([^]*?)\}/;
    const layoutMatch = cssContent.match(layoutBlockRegex);
    expect(layoutMatch).not.toBeNull();
    const layoutBody = layoutMatch![1];
    expect(layoutBody).toContain('height: 100% !important');
    expect(layoutBody).toContain('max-height: 100% !important');
    expect(layoutBody).not.toContain('--content-height');

    // 2. Check Svelte layout structure of PositionMainArea
    const sveltePath = path.resolve(process.cwd(), 'src/lib/components/position/PositionMainArea.svelte');
    expect(fs.existsSync(sveltePath)).toBe(true);
    const svelteContent = fs.readFileSync(sveltePath, 'utf-8');

    expect(svelteContent).toContain('id="position-main-area"');
    expect(svelteContent).toContain('flex-1');
    expect(svelteContent).toContain('min-h-0');
    expect(svelteContent).toContain('flex-col');
  });
});

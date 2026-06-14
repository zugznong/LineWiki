import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Wide Layout CSS Contract Tests', () => {
  it('should verify desktop-wide.css and desktop.css configure wide viewport scaling and correct height parameters', () => {
    const wideFilePath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop-wide.css');
    const wideContent = fs.readFileSync(wideFilePath, 'utf-8');

    const standardFilePath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop.css');
    const standardContent = fs.readFileSync(standardFilePath, 'utf-8');

    // 1. alignment and common content height - verify no viewport subtraction is done
    expect(standardContent).not.toContain('--content-height: calc(100dvh - 120px)');
    expect(standardContent).toContain('height: 100% !important');

    // 2. desktop 3 column grid system layout on wide screen
    expect(wideContent).toContain('#desktop-3-column-layout[data-layout-mode="standard"]');
    expect(wideContent).toContain('grid-template-columns:');

    // 3. container element center variables - center variables removed for screen height >= 820px
    expect(wideContent).toContain('and (min-height: 820px)');
    expect(wideContent).not.toContain('justify-content: center');
    expect(wideContent).not.toContain('align-items: center');

    // 4. verify standard horizontal centering and top alignment are used instead
    expect(wideContent).toContain('max-width: min(calc(100vw - 2rem), 1920px)');
    expect(wideContent).toContain('margin-left: auto');
    expect(wideContent).toContain('margin-right: auto');

    // 5. verify extreme wide media queries
    expect(wideContent).toContain('min-aspect-ratio: 21/9');
    expect(wideContent).toContain('min-width: 1536px');
  });

  it('should verify wide/short-height layout modes triggers unified 3-column setup with correct layout mode mapping', () => {
    const sveltePath = path.resolve(process.cwd(), 'src/lib/components/position/PositionMainArea.svelte');
    const content = fs.readFileSync(sveltePath, 'utf-8');

    // Confirm that the unified desktop-3-column-layout DOM exists
    expect(content).toContain('id="desktop-3-column-layout"');
    
    // Ensure viewport store state triggers data layout mode seamlessly
    expect(content).toContain('data-layout-mode={viewportStore.layoutMode === \'extremeShortHeight\' ? \'extreme-short\'');
    expect(content).toContain('isWideShortHeight');
  });

  it('should verify short-height wide css properties constrain rail blocks', () => {
    const cssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/short-height.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    // Verify presence of wide-short data-layout-mode under wideShortHeight parameters
    expect(content).toContain('min-width: 1440px');
    expect(content).toContain('max-height: 699px');
    expect(content).toContain('min-aspect-ratio: 2/1');
    expect(content).toContain('[data-layout-mode="wide-short"]');

    // Confirm candidate moves container height in right rail area is set to 200px max height clamp
    expect(content).toContain('#desktop-candidate-col');
    expect(content).toMatch(/height:\s*200px\s*!important/);
    expect(content).toMatch(/max-height:\s*200px\s*!important/);
  });

  it('should verify #desktop-candidate-col has full-height flex column constraints configured correctly in desktop.css', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop.css');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract the block containing candidate column rules
    const targetSelector = '#desktop-candidate-col';
    expect(content).toContain(targetSelector);

    const blockIndex = content.indexOf(targetSelector);
    const blockContent = content.substring(blockIndex, content.indexOf('}', blockIndex));

    // Verify concrete height is explicitly set to 100% and flex matches expectations
    expect(blockContent).toMatch(/height:\s*100%/);
    expect(blockContent).toMatch(/display:\s*flex/);
  });

  it('should verify short-height.css contains fallback to flex-start configuration preventing clipping on low-height screens', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/styles/devices/short-height.css');
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. media query for height restriction on large widths
    expect(content).toContain('@media (max-height: 699px) and (min-width: 1024px)');

    // 2. rollback definitions for position-main-area
    expect(content).toContain('justify-content: flex-start !important');
    expect(content).toContain('align-items: flex-start !important');

    // 3. rollback definitions for 3 column layout height and layout rules
    expect(content).toContain('align-items: flex-start !important');
  });
});

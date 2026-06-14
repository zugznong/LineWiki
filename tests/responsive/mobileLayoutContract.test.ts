import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Mobile and Tablet Layout Contract Tests', () => {
  const getSubBlock = (cssContent: string, selector: string): string => {
    const idx = cssContent.indexOf(selector);
    if (idx === -1) return '';
    const openBrace = cssContent.indexOf('{', idx);
    if (openBrace === -1) return '';
    const closeBrace = cssContent.indexOf('}', openBrace);
    if (closeBrace === -1) return '';
    return cssContent.substring(openBrace + 1, closeBrace);
  };

  it('should verify #mobile-single-flow-layout properties in mobile.css and tablet.css', () => {
    const mobilePath = path.resolve(process.cwd(), 'src/lib/styles/devices/mobile.css');
    const mobileCss = fs.readFileSync(mobilePath, 'utf-8');
    const tabletPath = path.resolve(process.cwd(), 'src/lib/styles/devices/tablet.css');
    const tabletCss = fs.readFileSync(tabletPath, 'utf-8');

    const mobileBlock = getSubBlock(mobileCss, '#mobile-single-flow-layout');
    expect(mobileBlock).toMatch(/height:\s*100%/);
    expect(mobileBlock).toMatch(/max-height:\s*100%/);
    expect(mobileBlock).toMatch(/overflow-y:\s*auto/);

    const tabletBlock = getSubBlock(tabletCss, '#mobile-single-flow-layout');
    expect(tabletBlock).toMatch(/height:\s*100%/);
    expect(tabletBlock).toMatch(/max-height:\s*100%/);
    expect(tabletBlock).toMatch(/overflow-y:\s*auto/);
  });

  it('should verify #move-history-strip is width: 100% or flex-basis: 100% in mobile-landscape.css', () => {
    const landscapePath = path.resolve(process.cwd(), 'src/lib/styles/devices/mobile-landscape.css');
    const landscapeCss = fs.readFileSync(landscapePath, 'utf-8');

    const stripBlock = getSubBlock(landscapeCss, '#move-history-strip');
    expect(stripBlock).toBeDefined();
    
    const hasWidth100 = /width:\s*100%/.test(stripBlock);
    const hasFlexBasis100 = /flex-basis:\s*100%/.test(stripBlock);

    expect(hasWidth100 || hasFlexBasis100).toBe(true);
  });

  it('should verify mobile, tablet, and landscape layouts all utilize consistent slot height configurations', () => {
    const mobilePath = path.resolve(process.cwd(), 'src/lib/styles/devices/mobile.css');
    const mobileCss = fs.readFileSync(mobilePath, 'utf-8');
    const tabletPath = path.resolve(process.cwd(), 'src/lib/styles/devices/tablet.css');
    const tabletCss = fs.readFileSync(tabletPath, 'utf-8');
    const landscapePath = path.resolve(process.cwd(), 'src/lib/styles/devices/mobile-landscape.css');
    const landscapeCss = fs.readFileSync(landscapePath, 'utf-8');

    // 1. Mobile slot height verification
    const mobileSlotBlock = getSubBlock(mobileCss, '#mobile-history-slot');
    expect(mobileSlotBlock).toContain('height: var(--move-history-strip-height)');

    // 2. Landscape slot height verification
    const landscapeSlotBlock = getSubBlock(landscapeCss, '#mobile-history-slot');
    expect(landscapeSlotBlock).toContain('height: var(--move-history-strip-height)');

    // 3. Tablet slot configuration verification: tablet.css shouldn't override other unique values inside slot block
    // It should leverage the core variables defined in moves.css cleanly.
    const tabletSlotBlock = getSubBlock(tabletCss, '#mobile-history-slot');
    // If tablet slot block is not explicitly specified, that is perfect because it inherits from moves.css (#desktop-history-slot, #mobile-history-slot rules)
    if (tabletSlotBlock) {
      expect(tabletSlotBlock).not.toMatch(/height:\s*(?!var\(--move-history-strip-height\))[0-9]+px/);
    }
  });

  it('should verify #mobile-candidate-moves-container has a concrete height and is not limited to max-height only in mobile.css and tablet.css', () => {
    const mobilePath = path.resolve(process.cwd(), 'src/lib/styles/devices/mobile.css');
    const mobileCss = fs.readFileSync(mobilePath, 'utf-8');
    const tabletPath = path.resolve(process.cwd(), 'src/lib/styles/devices/tablet.css');
    const tabletCss = fs.readFileSync(tabletPath, 'utf-8');

    const mobileBlock = getSubBlock(mobileCss, '#mobile-candidate-moves-container');
    // Ensure height property exists
    expect(mobileBlock).toMatch(/(?<!max-)height:/);
    
    // Explicitly reject blocks containing only max-height but no base height
    const hasPureHeightMobile = /(?<!max-)height:\s*[^;]+/i.test(mobileBlock);
    expect(hasPureHeightMobile).toBe(true);

    const tabletBlock = getSubBlock(tabletCss, '#mobile-candidate-moves-container');
    expect(tabletBlock).toMatch(/(?<!max-)height:/);
    
    const hasPureHeightTablet = /(?<!max-)height:\s*[^;]+/i.test(tabletBlock);
    expect(hasPureHeightTablet).toBe(true);
  });

  it('should verify #bottom-panel-container has responsive clamp() height or explicit height configurations in mobile.css and tablet.css', () => {
    const mobilePath = path.resolve(process.cwd(), 'src/lib/styles/devices/mobile.css');
    const mobileCss = fs.readFileSync(mobilePath, 'utf-8');
    const tabletPath = path.resolve(process.cwd(), 'src/lib/styles/devices/tablet.css');
    const tabletCss = fs.readFileSync(tabletPath, 'utf-8');

    const mobileBlock = getSubBlock(mobileCss, '#bottom-panel-container');
    const hasClampMobile = /height:\s*clamp\(/i.test(mobileBlock);
    expect(hasClampMobile).toBe(true);

    const tabletBlock = getSubBlock(tabletCss, '#bottom-panel-container');
    const hasClampTablet = /height:\s*clamp\(/i.test(tabletBlock);
    expect(hasClampTablet).toBe(true);
  });
});

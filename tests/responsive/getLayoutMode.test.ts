import { describe, it, expect } from 'vitest';
import { getLayoutMode } from '../../src/lib/responsive/getLayoutMode';

describe('getLayoutMode Tests', () => {
  it('should identify mobile mode', () => {
    // Width < 768, height >= 500
    expect(getLayoutMode(375, 812)).toBe('mobile');
    expect(getLayoutMode(767, 1024)).toBe('mobile');
    expect(getLayoutMode(412, 915)).toBe('mobile');
    expect(getLayoutMode(360, 740)).toBe('mobile');
  });

  it('should identify mobile-landscape mode', () => {
    // Width < 768, width > height, height < 500
    expect(getLayoutMode(667, 375)).toBe('mobile-landscape');
    expect(getLayoutMode(736, 414)).toBe('mobile-landscape');
    expect(getLayoutMode(700, 320)).toBe('mobile-landscape');
  });

  it('should identify short-height mode', () => {
    // Width >= 768, height < 600
    expect(getLayoutMode(900, 500)).toBe('short-height');
    expect(getLayoutMode(800, 599)).toBe('short-height');
    expect(getLayoutMode(1280, 480)).toBe('short-height');
  });

  it('should identify tablet mode', () => {
    // Width >= 768 and < 1024, height >= 600
    expect(getLayoutMode(768, 1024)).toBe('tablet');
    expect(getLayoutMode(1023, 800)).toBe('tablet');
    expect(getLayoutMode(820, 1180)).toBe('tablet');
  });

  it('should identify desktop mode', () => {
    // Width >= 1024 and < 1440, height >= 600
    expect(getLayoutMode(1024, 768)).toBe('desktop');
    expect(getLayoutMode(1439, 900)).toBe('desktop');
    expect(getLayoutMode(1280, 800)).toBe('desktop');
  });

  it('should identify desktop-wide mode', () => {
    // Width >= 1440, height >= 600
    expect(getLayoutMode(1440, 900)).toBe('desktop-wide');
    expect(getLayoutMode(2560, 1440)).toBe('desktop-wide');
    expect(getLayoutMode(1680, 1050)).toBe('desktop-wide');
  });

  it('should identify compactDesktop and lowHeightDesktop modes', () => {
    // compactDesktop: width < 1200, height >= 600 && height < 685, ratio >= 1.5
    expect(getLayoutMode(1024, 600)).toBe('compactDesktop');
    expect(getLayoutMode(1180, 640)).toBe('compactDesktop');

    // lowHeightDesktop: height >= 500 && height < 650, ratio >= 1.9
    expect(getLayoutMode(1366, 620)).toBe('lowHeightDesktop');
    expect(getLayoutMode(1440, 620)).toBe('lowHeightDesktop');
  });

  it('should prioritize mobile-landscape over short-height when width < 768', () => {
    // Width < 768, height < 600 (e.g. 640x480)
    // Since width < 768, and width > height, and height < 500, it becomes mobile-landscape
    expect(getLayoutMode(640, 480)).toBe('mobile-landscape');
    
    // Width < 768, height is 550 (height >= 500, so not mobile-landscape, should be mobile)
    expect(getLayoutMode(640, 550)).toBe('mobile');
  });
});


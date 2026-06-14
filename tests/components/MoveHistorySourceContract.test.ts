import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('MoveHistorySourceContract Pure Source File Contract Tests', () => {
  it('should verify that MoveHistoryStrip.svelte $effect body does not contain banned forceUpdate or invalidate calls', () => {
    const componentPath = path.resolve(process.cwd(), 'src/lib/components/moves/MoveHistoryStrip.svelte');
    expect(fs.existsSync(componentPath)).toBe(true);

    const componentContent = fs.readFileSync(componentPath, 'utf8');

    // $effect 블록 안에서 lineHistoryStore.forceUpdate() 또는 lineHistoryStore.invalidate() 호출이 없음 확인
    const effectPattern = /\$effect\s*\(\s*\(\s*\)\s*=>\s*\{([^]*?)\}\s*\)/g;
    let match;
    let effectCount = 0;
    while ((match = effectPattern.exec(componentContent)) !== null) {
      effectCount++;
      const effectBody = match[1];
      // 이펙트 본문 내부에서 lineHistoryStore.forceUpdate() 혹은 lineHistoryStore.invalidate()를 명시적으로 호출하는 패턴이 없어야 함
      expect(effectBody).not.toContain('lineHistoryStore.forceUpdate');
      expect(effectBody).not.toContain('lineHistoryStore.invalidate');
    }
  });
});

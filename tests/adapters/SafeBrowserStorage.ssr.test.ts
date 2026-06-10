import { describe, it, expect } from 'vitest';
import { SafeBrowserStorage } from '../../src/lib/adapters/storage/SafeBrowserStorage';

// 노드(SSR 유사) 환경에서는 window가 없으므로 isBrowser가 false입니다.
describe('SafeBrowserStorage (SSR / non-browser)', () => {
  const storage = new SafeBrowserStorage('localStorage');

  it('getItem returns null without touching window', () => {
    expect(storage.getItem('linewiki.board.theme')).toBeNull();
  });

  it('setItem is a safe no-op (does not throw)', () => {
    expect(() => storage.setItem('k', 'v')).not.toThrow();
  });

  it('removeItem is a safe no-op (does not throw)', () => {
    expect(() => storage.removeItem('k')).not.toThrow();
  });
});

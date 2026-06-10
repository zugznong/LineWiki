import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 브라우저 환경을 가정해 isBrowser를 true로 모킹합니다.
vi.mock('../../src/lib/config/runtimeConfig', () => ({ isBrowser: true }));

import { SafeBrowserStorage } from '../../src/lib/adapters/storage/SafeBrowserStorage';

function makeStore() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: vi.fn((k: string) => (map.has(k) ? map.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => void map.set(k, v)),
    removeItem: vi.fn((k: string) => void map.delete(k))
  };
}

describe('SafeBrowserStorage (browser)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
    // @ts-expect-error - cleanup test global
    delete globalThis.window;
  });

  it('reads and writes through to the underlying storage', () => {
    const ls = makeStore();
    (globalThis as { window?: unknown }).window = { localStorage: ls };
    const storage = new SafeBrowserStorage('localStorage');

    storage.setItem('linewiki.board.theme', 'Classic Green');
    expect(ls.setItem).toHaveBeenCalledWith('linewiki.board.theme', 'Classic Green');
    expect(storage.getItem('linewiki.board.theme')).toBe('Classic Green');
  });

  it('swallows a quota / security error on write and warns instead of throwing', () => {
    const throwing = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      }),
      removeItem: vi.fn()
    };
    (globalThis as { window?: unknown }).window = { localStorage: throwing };
    const storage = new SafeBrowserStorage('localStorage');

    expect(() => storage.setItem('k', 'v')).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when getItem throws', () => {
    const throwing = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    (globalThis as { window?: unknown }).window = { localStorage: throwing };
    const storage = new SafeBrowserStorage('localStorage');

    expect(storage.getItem('k')).toBeNull();
  });
});

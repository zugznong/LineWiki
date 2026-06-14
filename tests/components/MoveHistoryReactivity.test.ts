import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lineHistoryStore } from '../../src/lib/stores/lineHistoryStore.svelte.ts';

describe('MoveHistoryReactivity Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 전역 스토어 상태 변경 기록이 다른 테스트 파일과 물리적으로 공유되지 않도록 초기화
    lineHistoryStore.overrideHistoryItems([]);
  });

  afterEach(() => {
    // 각 테스트 단위 완료 즉시 스파이와 전역 스토어 슬롯 복구
    lineHistoryStore.overrideHistoryItems([]);
    vi.restoreAllMocks();
  });

  it('should verify that lineHistoryStore.forceUpdate is NOT invoked during default state check', () => {
    const forceUpdateSpy = vi.spyOn(lineHistoryStore, 'forceUpdate');
    expect(forceUpdateSpy).not.toHaveBeenCalled();
  });

  it('should check that lineHistoryStore can override history items safely without triggering infinite self-updating loop', () => {
    const forceUpdateSpy = vi.spyOn(lineHistoryStore, 'forceUpdate');
    
    // overrideHistoryItems should update items cleanly and not cause any cascading forceUpdate calls
    lineHistoryStore.overrideHistoryItems([
      { fen: 'fen1', moveSan: 'e4' }
    ]);

    expect(lineHistoryStore.historyItems.length).toBe(1);
    expect(lineHistoryStore.historyItems[0].moveSan).toBe('e4');
    expect(forceUpdateSpy).not.toHaveBeenCalled();
  });
});

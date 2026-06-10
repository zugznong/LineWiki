<script lang="ts">
  import PositionTopBar from './PositionTopBar.svelte';
  import PositionMainArea from './PositionMainArea.svelte';
  import PositionFallback from './PositionFallback.svelte';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { sessionHistoryStore } from '$lib/stores/sessionHistoryStore.svelte.ts';

  const storeError = $derived(positionStore.error);
  const currentPosition = $derived(positionStore.current);

  // 전역 단축키 핸들러 (Alt + ArrowLeft, [, Alt + ArrowRight, ])
  function handleKeyDown(e: KeyboardEvent) {
    const activeEl = document.activeElement;
    if (activeEl) {
      const tag = activeEl.tagName.toLowerCase();
      if (
        tag === 'input' || 
        tag === 'textarea' || 
        tag === 'select' || 
        tag === 'button' || 
        activeEl.hasAttribute('contenteditable') || 
        activeEl.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }
    }

    // 이전 수순 (Alt + ArrowLeft 또는 [)
    if ((e.altKey && e.key === 'ArrowLeft') || e.key === '[') {
      if (sessionHistoryStore.canGoBack) {
        e.preventDefault();
        sessionHistoryStore.goBack();
      }
    }
    // 다음 수순 (Alt + ArrowRight 또는 ])
    else if ((e.altKey && e.key === 'ArrowRight') || e.key === ']') {
      if (sessionHistoryStore.canGoForward) {
        e.preventDefault();
        sessionHistoryStore.goForward();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flex-1 flex flex-col h-screen overflow-hidden select-none text-slate-100 font-sans" id="position-page-shell">
  {#if storeError}
    <!-- FEN 또는 데이터 로드 상 에러 국면 진입 시의 폴백 화면 처리 -->
    <PositionFallback error={storeError} />
  {:else if !currentPosition}
    <!-- 로딩 국면 처리 -->
    <div class="flex-1 flex flex-col items-center justify-center gap-3" id="loading-position-state">
      <div class="relative flex h-10 w-10">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-10 w-10 bg-emerald-600 flex items-center justify-center font-bold text-slate-900 text-[11px]">Line</span>
      </div>
      <p class="text-xs text-slate-400 font-medium">체스 국면 데이터 구조 파싱 및 로컬 엔진 상태 점검 중...</p>
    </div>
  {:else}
    <!-- 정상 동작 국면 -->
    <PositionTopBar />
    <PositionMainArea />
  {/if}
</div>


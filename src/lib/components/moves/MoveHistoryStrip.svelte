<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/state';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { lineHistoryStore } from '$lib/stores/lineHistoryStore.svelte.ts';
  import { Footprints } from '@lucide/svelte';

  let isShared = $state(false);
  let stripPairsContainer: HTMLDivElement | undefined = $state();

  // 로컬 state 대신 중앙 캐싱된 lineHistoryStore를 반응형으로 참조
  const items = $derived.by(() => {
    if (isShared) {
      return [];
    }
    return lineHistoryStore.historyItems;
  });

  function calculateIsShared(): boolean {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const services = createAppServices();
      const startedFromApp = services.lineSession.isStartedFromApp();
      const hasHistory = lineHistoryStore.historyItems && lineHistoryStore.historyItems.length > 0;

      if (pathname.includes('/fen/') && !startedFromApp && !hasHistory) {
        return true;
      }
    }
    return false;
  }

  onMount(() => {
    lineHistoryStore.init();
    isShared = calculateIsShared();
  });

  // URL 변경 및 포지션 변경 시 실시간 세션 복원 동기화 (단, 저장소는 유스케이스가 명시적으로 update하므로 여기서 직접 forceUpdate를 동반하지 않음)
  $effect(() => {
    if (page.url || positionStore.current) {
      isShared = calculateIsShared();
    }
  });

  function handleJump(fen: string, element?: HTMLButtonElement) {
    const services = createAppServices();
    services.navigateMove.execute(fen);
    if (element) {
      tick().then(() => {
        element.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      });
    }
  }

  // 홀수/짝수 인덱스로 반환하여 화이트/블랙 쌍으로 수순 묶음 계산
  const movePairs = $derived.by(() => {
    const pairs: { index: number; white: string; whiteFen: string; black?: string; blackFen?: string }[] = [];
    
    // items 중 moveSan이 존재하는 실제 이동들만 추출
    const activeMoves = items.filter(item => item.moveSan !== null);
    
    for (let i = 0; i < activeMoves.length; i += 2) {
      const pairIndex = Math.floor(i / 2) + 1;
      pairs.push({
        index: pairIndex,
        white: activeMoves[i].moveSan || '...',
        whiteFen: activeMoves[i].fen,
        black: activeMoves[i + 1]?.moveSan ?? undefined,
        blackFen: activeMoves[i + 1]?.fen ?? undefined
      });
    }
    return pairs;
  });

  // 새 수 자동 추적: items.length가 증가할 때 최우측으로 스크롤 이동
  let prevCount = 0;
  $effect(() => {
    const currentLength = items.length;
    if (currentLength > prevCount) {
      prevCount = currentLength;
      if (stripPairsContainer) {
        tick().then(() => {
          if (stripPairsContainer) {
            stripPairsContainer.scrollLeft = stripPairsContainer.scrollWidth;
          }
        });
      }
    } else {
      prevCount = currentLength;
    }
  });
</script>

<div 
  class="move-history-strip w-full max-w-full min-w-0 overflow-hidden shrink-0 self-stretch flex items-center gap-2 bg-[var(--color-bg-card)]/60 border border-[var(--color-border-primary)] rounded-xl"
  id="move-history-strip"
>
  <div class="flex items-center gap-1.5 shrink-0 text-slate-400 border-r border-[var(--color-border-primary)] pr-3 select-none max-w-[80px] overflow-hidden whitespace-nowrap text-ellipsis">
    <Footprints size={12} class="text-emerald-400 shrink-0" />
    <span class="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">기보</span>
  </div>

  <!-- 가로로 쭉 스크롤되는 무브 칩(Chips)들 노출 -->
  <div 
    bind:this={stripPairsContainer}
    class="flex items-center gap-2 py-0.5 max-w-full scrollbar-none overflow-x-auto" 
    style="flex: 1 1 0px; width: 0px; min-width: 0px; overflow-x: auto; white-space: nowrap;"
    id="strip-pairs-container"
  >
    {#if movePairs.length > 0}
      {#each movePairs as pair}
        <span class="text-[11px] font-mono font-black text-slate-500 shrink-0 select-none whitespace-nowrap">
          {pair.index}.
        </span>

        <!-- 백색 수순 무브 버튼 -->
        <button
          onclick={(e) => handleJump(pair.whiteFen, e.currentTarget)}
          data-current-move={positionStore.current?.fen === pair.whiteFen ? "true" : undefined}
          aria-current={positionStore.current?.fen === pair.whiteFen ? "step" : undefined}
          class="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer select-none font-sans whitespace-nowrap
            {positionStore.current?.fen === pair.whiteFen 
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/20' 
              : 'text-slate-200 hover:bg-[var(--color-bg-panel)]/80 hover:text-white'}"
        >
          {pair.white}
        </button>

        <!-- 흑색 수순 무브 버튼 (있을 때만 노출) -->
        {#if pair.black && pair.blackFen}
          <button
            onclick={(e) => handleJump(pair.blackFen!, e.currentTarget)}
            data-current-move={positionStore.current?.fen === pair.blackFen ? "true" : undefined}
            aria-current={positionStore.current?.fen === pair.blackFen ? "step" : undefined}
            class="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer select-none font-sans whitespace-nowrap
              {positionStore.current?.fen === pair.blackFen 
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/20' 
                : 'text-slate-200 hover:bg-[var(--color-bg-panel)]/80 hover:text-white'}"
          >
            {pair.black}
          </button>
        {/if}
      {/each}
    {:else}
      <span class="text-[11px] text-slate-500 italic font-medium shrink-0 select-none whitespace-nowrap overflow-hidden text-ellipsis">
        아직 기록된 수가 없습니다.
      </span>
    {/if}
  </div>
</div>

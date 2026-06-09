<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { Footprints } from '@lucide/svelte';

  let items = $state<{ fen: string; moveSan: string | null }[]>([]);
  let isShared = $state(false);

  function checkAndLoadHistory() {
    if (typeof window !== 'undefined') {
      // 공유 링크 직접 진입 여부 체크
      const pathname = window.location.pathname;
      const startedFromApp = sessionStorage.getItem('linewiki.session.startedFromApp');
      if (pathname.includes('/fen/') && !startedFromApp) {
        isShared = true;
        items = [];
        return;
      } else {
        isShared = false;
      }
    }

    const services = createAppServices();
    const historyRes = services.restoreLineHistory.execute();
    if (historyRes.isOk()) {
      items = historyRes.unwrap();
    }
  }

  onMount(() => {
    checkAndLoadHistory();
  });

  // URL 변경 및 포지션 변경 시 실시간 세션 복원 동기화
  $effect(() => {
    if (page.url || positionStore.current) {
      checkAndLoadHistory();
    }
  });

  function handleJump(fen: string) {
    const services = createAppServices();
    services.navigateMove.execute(fen);
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
</script>

{#if !isShared && items.length > 0}
  <div 
    class="move-history-strip flex items-center gap-3.5 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl overflow-x-auto scrollbar-none shrink-0"
    id="move-history-strip"
  >
    <div class="flex items-center gap-1.5 shrink-0 text-slate-400 border-r border-slate-800 pr-3 select-none">
      <Footprints size={12} class="text-emerald-400" />
      <span class="text-[10px] font-bold uppercase tracking-wider">세션 전개 흐름</span>
    </div>

    <!-- 가로로 쭉 스크롤되는 무브 칩(Chips)들 노출 -->
    <div class="flex items-center gap-2 overflow-x-auto py-0.5" id="strip-pairs-container">
      {#each movePairs as pair}
        <span class="text-[11px] font-mono font-black text-slate-500 shrink-0 select-none">
          {pair.index}.
        </span>

        <!-- 백색 수순 무브 버튼 -->
        <button
          onclick={() => handleJump(pair.whiteFen)}
          class="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer select-none font-sans
            {positionStore.current?.fen === pair.whiteFen 
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/20' 
              : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'}"
        >
          {pair.white}
        </button>

        <!-- 흑색 수순 무브 버튼 (있을 때만 노출) -->
        {#if pair.black && pair.blackFen}
          <button
            onclick={() => handleJump(pair.blackFen!)}
            class="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer select-none font-sans
              {positionStore.current?.fen === pair.blackFen 
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/20' 
                : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'}"
          >
            {pair.black}
          </button>
        {/if}
      {/each}
    </div>
  </div>
{/if}

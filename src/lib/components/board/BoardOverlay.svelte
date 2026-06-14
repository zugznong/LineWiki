<script lang="ts">
  import { RotateCcw } from '@lucide/svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';

  let { 
    isCheckmate, 
    isDraw, 
    activeColor, 
    onReset,
    orderedFiles = [],
    orderedRanks = [],
    legalDestinations = [],
    dragHoverSquare = null
  } = $props<{
    isCheckmate: boolean;
    isDraw: boolean;
    activeColor: 'w' | 'b';
    onReset: () => void;
    orderedFiles?: ('a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h')[];
    orderedRanks?: number[];
    legalDestinations?: string[];
    dragHoverSquare?: string | null;
  }>();

  const resultTitle = $derived(
    isCheckmate 
      ? (activeColor === 'w' ? '흑색 승리 (체크메이트)' : '백색 승리 (체크메이트)')
      : '무승부 (Draw / Stalemate)'
  );
</script>

{#if isCheckmate || isDraw}
  <div class="absolute inset-0 bg-[var(--color-bg-nested)]/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center" id="board-overlay">
    <div class="space-y-4 max-w-xs">
      <div class="text-xs uppercase tracking-widest text-emerald-400 font-bold">연구 세션 종료</div>
      <h3 class="text-2xl font-bold text-white tracking-tight">{resultTitle}</h3>
      <p class="text-slate-400 text-xs">포지션의 하중이 전부 차단되었습니다. 다른 분기를 탐험하거나 시작화면으로 복원하십시오.</p>
      
      <button 
        onclick={onReset}
        class="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition hover:scale-105 active:scale-95 cursor-pointer"
      >
        <RotateCcw size={14} />
        시작 위치로 가기
      </button>
    </div>
  </div>
{:else if boardStore.dragState.type === 'dragging'}
  <div class="absolute inset-0 z-30 grid grid-cols-8 grid-rows-8 pointer-events-none animate-fade-in" id="board-drag-overlay-grid">
    {#each orderedRanks as rank}
      {#each orderedFiles as file}
        {@const sqStr = `${file}${rank}`}
        {@const isDest = legalDestinations.includes(sqStr)}
        {@const isHovered = dragHoverSquare === sqStr}
        
        <div 
          class="relative w-full h-full flex items-center justify-center"
          id="drag-overlay-square-{sqStr}"
        >
          <!-- 드래그 목적지 하이라이트 및 호버 상태 적용 -->
          {#if isDest}
            <div 
              class="absolute inset-0 bg-emerald-500/25 border-[3px] border-emerald-400 rounded-[2px]"
              class:drag-over-tile={isHovered}
            ></div>
          {/if}
        </div>
      {/each}
    {/each}
  </div>
{/if}

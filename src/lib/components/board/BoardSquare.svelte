<script lang="ts">
  import BoardCoordinates from './BoardCoordinates.svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';

  let { 
    file, 
    rank, 
    isSelected, 
    isLastMove, 
    isHighlightDestination,
    onclick,
    children 
  } = $props<{
    file: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
    rank: number;
    isSelected: boolean;
    isLastMove: boolean;
    isHighlightDestination: boolean;
    onclick: () => void;
    children?: any;
  }>();

  const isLight = $derived(((file.charCodeAt(0) - 97) + rank) % 2 !== 0);

  // Background visual themes colors inline mapping
  const bgColor = $derived(
    isLight ? boardStore.colors.light : boardStore.colors.dark
  );

  // 접근성을 위한 대수 기명(Algebraic notation) 음성 레이아웃 정보 조합
  const squareLabel = $derived(
    `${file}${rank}` + 
    (isLight ? ', light square' : ', dark square') + 
    (isSelected ? ', selected' : '') + 
    (isLastMove ? ', last move source or destination' : '') + 
    (isHighlightDestination ? ', playable legal destination' : '')
  );

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick();
    }
  }
</script>

<div 
  class="chess-square relative select-none cursor-pointer transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-inset flex items-center justify-center"
  style="background-color: {bgColor};"
  {onclick}
  onkeydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label={squareLabel}
  aria-pressed={isSelected}
  id="square-{file}{rank}"
>
  {@render children?.()}
  
  <BoardCoordinates {file} {rank} {isLight} />

  <!-- Selected outline colors -->
  {#if isSelected}
    <div class="absolute inset-0 bg-emerald-500/30 border-[3px] border-emerald-400 z-10 pointer-events-none rounded-[2px]" id="selected-{file}{rank}"></div>
  {/if}

  <!-- Last moved background overlay -->
  {#if isLastMove}
    <div class="absolute inset-0 bg-amber-400/25 pointer-events-none z-0"></div>
  {/if}

  <!-- Target destination indicators - Highlight dots -->
  {#if isHighlightDestination && boardStore.highlightLegalDestinations}
    <div class="absolute w-4 h-4 rounded-full bg-emerald-400/70 border-2 border-slate-950/20 shadow-sm z-20 pointer-events-none animate-pulse" id="dest-{file}{rank}"></div>
  {/if}
</div>

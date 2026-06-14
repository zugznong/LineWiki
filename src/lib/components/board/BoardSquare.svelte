<script lang="ts">
  import BoardCoordinates from './BoardCoordinates.svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import { isLightSquare } from '$lib/domain/chess/SquareColor';

  let { 
    file, 
    rank, 
    isSelected, 
    isLastMove, 
    isHighlightDestination,
    isCaptureDestination,
    hasPiece = false,
    pieceType,
    pieceColor,
    onkeydown,
    children 
  } = $props<{
    file: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
    rank: number;
    isSelected: boolean;
    isLastMove: boolean;
    isHighlightDestination: boolean;
    isCaptureDestination: boolean;
    hasPiece?: boolean;
    pieceType?: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
    pieceColor?: 'w' | 'b';
    onkeydown?: (e: KeyboardEvent) => void;
    children?: any;
  }>();

  const isLight = $derived(isLightSquare(file, rank));

  // Background visual themes colors inline mapping
  const bgColor = $derived(
    isLight ? boardStore.colors.light : boardStore.colors.dark
  );

  const pieceColorName = $derived(pieceColor === 'w' ? '백' : '흑');
  const pieceTypeName = $derived(
    pieceType === 'p' ? '폰' :
    pieceType === 'r' ? '룩' :
    pieceType === 'n' ? '나이트' :
    pieceType === 'b' ? '비숍' :
    pieceType === 'q' ? '퀸' :
    pieceType === 'k' ? '킹' : ''
  );

  // 접근성을 위한 대수 기명(Algebraic notation) 음성 레이아웃 정보 조합
  const squareLabel = $derived(
    `${file}${rank}` + 
    (pieceType ? ` ${pieceColorName} ${pieceTypeName}` : '') + 
    (isLight ? ', light square' : ', dark square') + 
    (isSelected ? ', selected' : '') + 
    (isLastMove ? ', last move source or destination' : '') + 
    (isHighlightDestination ? ', playable legal destination' : '') +
    (hasPiece ? ', occupied' : ', empty')
  );
</script>

<div 
  class="chess-square relative select-none cursor-pointer transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-inset flex items-center justify-center w-full h-full"
  class:selected-tile={isSelected && !(boardStore.dragState.type === 'dragging' && boardStore.dragState.fromSquare === `${file}${rank}`)}
  class:last-move-tile={isLastMove}
  class:light-tile={isLight}
  class:dark-tile={!isLight}
  style="background-color: {bgColor};"
  data-square="{file}{rank}"
  aria-label={squareLabel}
  aria-selected={isSelected}
  id="square-{file}{rank}"
  role="gridcell"
  tabindex="0"
  {onkeydown}
>
  {@render children?.()}
  
  <BoardCoordinates {file} {rank} {isLight} />

  <!-- Selected outline overlay (non-colliding layers) -->
  {#if isSelected && !(boardStore.dragState.type === 'dragging' && boardStore.dragState.fromSquare === `${file}${rank}`)}
    <div class="absolute inset-0 bg-emerald-500/15 border-[3px] border-emerald-400 z-10 pointer-events-none rounded-[2px]" id="selected-{file}{rank}"></div>
  {/if}

  <!-- Last moved background overlay (non-colliding layers) -->
  {#if isLastMove}
    <div class="absolute inset-0 bg-amber-400/20 pointer-events-none z-0"></div>
  {/if}

  <!-- Target destination indicators - Highlight dots / Capture rings -->
  {#if isHighlightDestination && boardStore.highlightLegalDestinations}
    {#if isCaptureDestination}
      <div class="absolute legal-capture-ring inset-[8%] rounded-full border z-20 pointer-events-none" id="capture-{file}{rank}"></div>
    {:else}
      <div class="absolute rounded-full bg-emerald-400/70 border-2 border-slate-950/20 shadow-sm z-20 pointer-events-none legal-destination-dot legal-dot-indicator" id="dest-{file}{rank}"></div>
    {/if}
  {/if}
</div>

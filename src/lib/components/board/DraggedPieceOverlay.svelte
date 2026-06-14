<script lang="ts">
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import BoardPiece from './BoardPiece.svelte';

  let { squareSize } = $props<{
    squareSize: number;
  }>();

  const drag = $derived(boardStore.dragState);
</script>

{#if drag.type === 'dragging'}
  <div 
    class="pointer-events-none fixed z-[9999] drop-shadow-2xl opacity-95 transition-none dragged-piece-overlay flex items-center justify-center"
    style="left: {drag.currentClientX}px; top: {drag.currentClientY}px; width: {squareSize}px; height: {squareSize}px; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center;"
    id="dragged-piece-overlay-el"
  >
    <BoardPiece 
      type={drag.piece.toLowerCase() as any} 
      color={drag.pieceColor} 
      size={squareSize} 
      styleName={boardStore.pieceStyle}
    />
  </div>
{/if}

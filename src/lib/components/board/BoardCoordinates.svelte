<script lang="ts">
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';

  let { file, rank, isLight } = $props<{
    file: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
    rank: number;
    isLight: boolean;
  }>();

  const isFlipped = $derived(boardStore.orientation === 'black');

  // Labels rendering coordinates conditions
  const showFileLabel = $derived(isFlipped ? rank === 8 : rank === 1);
  const showRankLabel = $derived(isFlipped ? file === 'h' : file === 'a');
</script>

{#if boardStore.showCoordinates}
  {#if showFileLabel}
    <span 
      class="absolute bottom-0.5 right-1 text-[9px] md:text-[10px] font-bold select-none"
      style="color: {isLight ? boardStore.colors.dark : boardStore.colors.light};"
    >
      {file}
    </span>
  {/if}

  {#if showRankLabel}
    <span 
      class="absolute top-0.5 left-1 text-[9px] md:text-[10px] font-bold select-none"
      style="color: {isLight ? boardStore.colors.dark : boardStore.colors.light};"
    >
      {rank}
    </span>
  {/if}
{/if}

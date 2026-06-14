<script lang="ts">
  import { promotionStore } from '$lib/stores/promotionStore.svelte.ts';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import BoardPiece from './BoardPiece.svelte';
  import type { PromotionPiece } from '$lib/domain/chess/PromotionChoice';

  let currentReq = $derived(promotionStore.pendingPromotion);
  let activeColor = $derived(positionStore.current?.activeColor || 'w');

  const promotionOptions: { type: PromotionPiece; label: string }[] = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' }
  ];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && currentReq) {
      promotionStore.cancelPromotion();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if currentReq}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-[1000] flex items-center justify-center rounded-[2px]"
    onclick={() => promotionStore.cancelPromotion()}
    id="promotion-picker-backdrop"
  >
    <!-- Picker container card -->
    <div 
      class="bg-[var(--color-bg-card)]/95 border border-[var(--color-border-primary)] p-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 max-w-[280px] w-auto"
      onclick={(e) => e.stopPropagation()}
      id="promotion-picker-card"
    >
      <span class="text-xs font-semibold tracking-wider uppercase text-slate-400 select-none">
        Select Promotion Piece
      </span>
      
      <div class="flex items-center gap-2" id="promotion-options-list">
        {#each promotionOptions as opt}
          <button
            class="w-12 h-12 rounded-lg bg-[var(--color-bg-nested)]/40 hover:bg-[var(--color-bg-nested)]/90 border border-[var(--color-border-primary)]/50 active:scale-95 transition-all flex items-center justify-center group"
            onclick={() => promotionStore.choosePromotion(opt.type)}
            title={opt.label}
            aria-label="Promote to {opt.label}"
          >
            <div class="group-hover:scale-105 transition-transform">
              <BoardPiece 
                type={opt.type} 
                color={activeColor} 
                size={40} 
              />
            </div>
          </button>
        {/each}
      </div>

      <button 
        class="text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 uppercase tracking-wider"
        onclick={() => promotionStore.cancelPromotion()}
      >
        Cancel
      </button>
    </div>
  </div>
{/if}

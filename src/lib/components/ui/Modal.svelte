<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { X } from '@lucide/svelte';

  let {
    show = $bindable(false),
    title = '',
    id,
    onclose,
    children
  } = $props<{
    show?: boolean;
    title?: string;
    id?: string;
    onclose?: () => void;
    children?: Snippet;
  }>();

  function closeModal() {
    show = false;
    if (onclose) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && show) {
      closeModal();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none"
    transition:fade={{ duration: 150 }}
    onclick={closeModal}
    role="presentation"
    {id}
  >
    <!-- Modal content container -->
    <div 
      class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4 overflow-hidden relative"
      transition:scale={{ duration: 180, start: 0.95 }}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="{id ? `${id}-title` : 'modal-title'}"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <h3 
          class="text-sm font-extrabold text-slate-100 tracking-tight" 
          id="{id ? `${id}-title` : 'modal-title'}"
        >
          {title}
        </h3>
        
        <button 
          onclick={closeModal}
          class="text-slate-500 hover:text-slate-200 transition p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
          aria-label="닫기"
          id="{id ? `${id}-close-icon-btn` : 'modal-close-icon-btn'}"
        >
          <X size={15} />
        </button>
      </div>

      <!-- Main Body -->
      <div class="max-h-[70vh] overflow-y-auto pr-1" id="{id ? `${id}-body` : 'modal-body'}">
        {#if children}
          {@render children()}
        {/if}
      </div>
    </div>
  </div>
{/if}

<script lang="ts">
  import { ArrowUpDown, Settings } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { panelStore } from '$lib/stores/panelStore.svelte.ts';
  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';

  function handleFlip() {
    const services = createAppServices();
    services.flipBoard.execute();
  }

  async function handleOpenSettings() {
    panelStore.setActiveTab('settings');
    if (!viewportStore.usesDesktopShell) {
      await tick();
      const container = document.getElementById('bottom-panel-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
</script>

<div class="inline-flex items-center gap-2" id="board-shortcut-toolbar">
  <button
    onclick={handleFlip}
    class="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] px-3 py-2 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold select-none"
    aria-label="보드 플립"
    id="flip-board-btn"
  >
    <ArrowUpDown size={13} class="text-emerald-400" />
    <span>시점 반전</span>
  </button>

  <button
    onclick={handleOpenSettings}
    class="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-panel)] border border-[var(--color-border-primary)] px-3 py-2 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold select-none"
    aria-label="보드 설정 열기"
    id="open-settings-shortcut-btn"
  >
    <Settings size={13} class="text-emerald-400" />
    <span>테마 & 설정</span>
  </button>
</div>


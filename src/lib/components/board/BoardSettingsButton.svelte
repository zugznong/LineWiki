<script lang="ts">
  import { ArrowUpDown, Settings } from '@lucide/svelte';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { panelStore } from '$lib/stores/panelStore.svelte.ts';
  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';

  function handleFlip() {
    const services = createAppServices();
    services.flipBoard.execute();
  }

  function handleOpenSettings() {
    if (viewportStore.isMobile) {
      panelStore.toggleMobileSettings();
    } else {
      panelStore.setDesktopActiveTab('settings');
    }
  }
</script>

<div class="inline-flex items-center gap-2" id="board-shortcut-toolbar">
  <button
    onclick={handleFlip}
    class="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold select-none"
    aria-label="보드 플립"
    id="flip-board-btn"
  >
    <ArrowUpDown size={13} class="text-emerald-400" />
    <span>시점 반전</span>
  </button>

  <button
    onclick={handleOpenSettings}
    class="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold select-none"
    aria-label="보드 설정 열기"
    id="open-settings-shortcut-btn"
  >
    <Settings size={13} class="text-emerald-400 animate-[spin_10s_linear_infinite]" />
    <span>테마 & 설정</span>
  </button>
</div>


<script lang="ts">
  import PanelTabs from './PanelTabs.svelte';
  import EnginePanel from './EnginePanel.svelte';
  import ServerPanel from './ServerPanel.svelte';
  import NotesPanel from './NotesPanel.svelte';
  import DiscussionPanel from './DiscussionPanel.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import { panelStore } from '$lib/stores/panelStore.svelte.ts';

  const activeTab = $derived(panelStore.activeTab);
</script>

<div class="flex flex-col border border-slate-800 bg-slate-900/25 rounded-2xl overflow-hidden shrink-0 min-h-[360px]" id="bottom-panel-container">
  <div class="px-4 py-3 border-b border-slate-800 bg-slate-950/30 shrink-0">
    <h3 class="text-xs font-bold text-slate-300">정밀 분석 패널 (Details & Analysis)</h3>
  </div>

  <PanelTabs />
  
  <div class="flex-1 overflow-y-auto flex flex-col bg-slate-900/5 p-1 min-h-0" id="bottom-panel-content">
    {#if activeTab === 'engine'}
      <EnginePanel />
    {:else if activeTab === 'server'}
      <ServerPanel />
    {:else if activeTab === 'notes'}
      <NotesPanel />
    {:else if activeTab === 'discussion'}
      <DiscussionPanel />
    {:else if activeTab === 'settings'}
      <SettingsPanel />
    {/if}
  </div>
</div>

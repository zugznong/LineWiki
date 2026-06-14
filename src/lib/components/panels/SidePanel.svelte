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

<div class="h-full flex-1 flex flex-col border border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] rounded-xl overflow-hidden min-h-0 max-h-full" id="side-panel-container">
  <PanelTabs />
  
  <div class="flex-1 flex flex-col min-h-0 max-h-full overflow-hidden" id="side-panel-content">
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

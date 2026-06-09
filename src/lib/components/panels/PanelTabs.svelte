<script lang="ts">
  import { Cpu, Cloud, BookOpen, MessageSquare, Settings } from '@lucide/svelte';
  import { panelStore, type PanelTabType } from '$lib/stores/panelStore.svelte.ts';
  import Tabs from '../ui/Tabs.svelte';

  const activeTab = $derived(panelStore.activeTab);

  const tabs = [
    { id: 'engine', label: '엔진', icon: Cpu },
    { id: 'server', label: '서버 분석', icon: Cloud },
    { id: 'notes', label: '위키', icon: BookOpen },
    { id: 'discussion', label: '의견', icon: MessageSquare },
    { id: 'settings', label: '설정', icon: Settings }
  ];

  function handleTabChange(id: string) {
    panelStore.setActiveTab(id as PanelTabType);
  }
</script>

<Tabs 
  {tabs} 
  activeId={activeTab} 
  onchange={handleTabChange}
  id="panel-tabs-navigation"
/>


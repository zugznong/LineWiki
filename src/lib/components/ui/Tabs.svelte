<script lang="ts">
  import type { Component } from 'svelte';

  let {
    tabs,
    activeId = $bindable(),
    onchange,
    id,
    class: inlineClass = ''
  } = $props<{
    tabs: { id: string; label: string; icon?: Component<any> | any }[];
    activeId: string;
    onchange?: (id: string) => void;
    id?: string;
    class?: string;
  }>();

  function selectTab(tabId: string) {
    activeId = tabId;
    if (onchange) {
      onchange(tabId);
    }
  }

  function handleKeyDown(e: KeyboardEvent, tabId: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectTab(tabId);
    }
  }
</script>

<div 
  class="flex border-b border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] px-2 py-1 gap-1 overflow-x-auto scrollbar-none {inlineClass}" 
  {id}
  role="tablist"
>
  {#each tabs as t}
    {@const IconComp = t.icon}
    <button
      role="tab"
      aria-selected={activeId === t.id}
      aria-controls="panel-{t.id}"
      tabindex={activeId === t.id ? 0 : -1}
      onclick={() => selectTab(t.id)}
      onkeydown={(e) => handleKeyDown(e, t.id)}
      class="flex-1 min-w-[65px] inline-flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition duration-150 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400/30
        {activeId === t.id 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner' 
          : 'text-slate-400 hover:bg-[var(--color-bg-nested)] hover:text-slate-200 border border-transparent'}"
      id="tab-btn-{t.id}"
    >
      {#if IconComp}
        <IconComp size={13} class="shrink-0" />
      {/if}
      <span class="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">{t.label}</span>
    </button>
  {/each}
</div>

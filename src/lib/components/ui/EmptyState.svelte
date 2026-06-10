<script lang="ts">
  import type { Component } from 'svelte';
  import { HelpCircle } from '@lucide/svelte';

  let {
    title,
    description = '',
    icon,
    id
  } = $props<{
    title: string;
    description?: string;
    icon?: Component<any> | any;
    id?: string;
  }>();

  const IconComponent = $derived(icon || HelpCircle);
</script>

<div 
  class="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]/50 space-y-3 select-none w-full"
  {id}
>
  <div class="p-3 bg-[var(--color-bg-nested)] rounded-2xl border border-[var(--color-border-primary)] text-slate-500 hover:scale-105 transition duration-150">
    <IconComponent size={20} class="text-slate-500 shrink-0" />
  </div>

  <div class="space-y-1 max-w-[240px]">
    <h4 class="text-xs font-extrabold text-slate-300 tracking-tight">{title}</h4>
    {#if description}
      <p class="text-[10px] text-slate-500 leading-normal">{description}</p>
    {/if}
  </div>
</div>

<script lang="ts">
  import { Lock } from '@lucide/svelte';

  let { title, description } = $props<{
    title: string;
    description: string;
  }>();
</script>

<div class="flex items-start justify-between p-3.5 rounded-xl border border-slate-900 bg-slate-950/20 opacity-60 select-none" id="coming-soon-{title.toLowerCase().replace(/[^a-z0-9]/g, '-')}">
  <div class="space-y-1">
    <div class="flex items-center gap-1.5">
      <span class="text-xs font-bold text-slate-300">{title}</span>
      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-wider">
        <Lock size={8} />
        <span>준비 중</span>
      </span>
    </div>
    <p class="text-[10px] text-slate-500 leading-normal">{description}</p>
  </div>
</div>

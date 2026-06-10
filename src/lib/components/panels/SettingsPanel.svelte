<script lang="ts">
  import { Palette, Layers, Grid3X3, Eye, Sparkles } from '@lucide/svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import BoardSettingsPanel from '../settings/BoardSettingsPanel.svelte';

  const activeTheme = $derived(boardStore.themeName);
  const activeStyle = $derived(boardStore.pieceStyle);
</script>

<div class="p-4 pb-4 space-y-6 overflow-y-auto flex-1 flex flex-col justify-start min-h-0 h-full scrollbar-thin overscroll-contain" id="settings-panel">
  <!-- Active Configuration Showcase Card -->
  <div class="space-y-3 shrink-0">
    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
      <Palette size={13} class="text-emerald-400" />
      오픈베타 0 활성 그래픽 테마
    </div>

    <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl p-4 space-y-3.5">
      <!-- Theme Status Row -->
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-slate-400 font-medium">보드 컬러 스킨</span>
          <span class="text-sm font-bold text-slate-100">{activeTheme}</span>
        </div>
        <div class="flex items-center gap-1.5 border border-[var(--color-border-primary)] bg-[var(--color-bg-nested)] p-1.5 rounded-lg">
          <span class="w-5 h-5 rounded-[4px] border border-slate-950/20" style="background-color: #eeeed2;"></span>
          <span class="w-5 h-5 rounded-[4px] border border-slate-950/20" style="background-color: #769656;"></span>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-[var(--color-border-primary)]/60 w-full"></div>

      <!-- Piece Style Status Row -->
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-slate-400 font-medium">체스 기물 스타일</span>
          <span class="text-sm font-bold text-slate-100">{activeStyle}</span>
        </div>
        <div class="font-bold text-slate-200 text-sm tracking-widest bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)] px-3 py-1.5 rounded-lg flex items-center justify-center gap-1">
          <span>♙</span>
          <span>♟</span>
          <span class="text-[10px] text-slate-500 font-normal">Active</span>
        </div>
      </div>
    </div>
  </div>

  <!-- BoardSettingsPanel Embedded Integration -->
  <div class="border-t border-[var(--color-border-primary)] pt-5 space-y-3">
    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
      <Eye size={13} class="text-emerald-400" />
      <span>개인화 & 컴포넌트 로드맵</span>
    </div>
    
    <BoardSettingsPanel />
  </div>
</div>



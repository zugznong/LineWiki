<script lang="ts">
  import { Palette, Eye, Check } from '@lucide/svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import { BoardTheme } from '$lib/domain/board/BoardTheme';
  import { createStorageServices } from '$lib/composition/createStorageServices';
  import BoardSettingsPanel from '../settings/BoardSettingsPanel.svelte';
  import BoardPiece from '../board/BoardPiece.svelte';
  import PieceStyleSelector from '../settings/PieceStyleSelector.svelte';
  import EngineSettingsPanel from '../settings/EngineSettingsPanel.svelte';

  const storageServices = createStorageServices();

  const themes = BoardTheme.getAllThemes();

  const activeTheme = $derived(boardStore.themeName);
  const activeStyle = $derived(boardStore.pieceStyle);

  function handleThemeSelect(themeName: string) {
    storageServices.selectBoardTheme.execute(themeName);
  }

  function handlePieceStyleSelect(styleName: string) {
    storageServices.selectPieceStyle.execute(styleName);
  }
</script>

<div class="p-4 pb-4 space-y-6 min-h-0 h-full max-h-full overflow-y-auto flex-1 flex flex-col justify-start scrollbar-thin overscroll-contain min-w-0 max-w-full box-border" id="settings-panel">
  <!-- Active Configuration Showcase Card -->
  <div class="space-y-3 shrink-0">
    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
      <Palette size={13} class="text-emerald-400" />
      개인화 그래픽 제어판 (Graphic Theme Panel)
    </div>

    <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl p-4 space-y-4">
      <!-- Theme Status Row -->
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-slate-400 font-medium">보드 컬러 스킨</span>
          <span class="text-sm font-bold text-slate-100">{activeTheme}</span>
        </div>
        <div class="flex items-center gap-1.5 border border-[var(--color-border-primary)] bg-[var(--color-bg-nested)] p-1.5 rounded-lg">
          <span class="w-5 h-5 rounded-[4px] border border-slate-950/20 shadow-sm" style="background-color: {boardStore.colors.light};"></span>
          <span class="w-5 h-5 rounded-[4px] border border-slate-950/20 shadow-sm" style="background-color: {boardStore.colors.dark};"></span>
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
        <div class="font-bold text-slate-200 text-sm tracking-widest bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)] px-3 py-1 rounded-lg flex items-center justify-center gap-2 shadow-inner">
          <BoardPiece type="k" color="w" size={24} />
          <BoardPiece type="p" color="b" size={24} />
          <span class="text-[10px] text-slate-500 font-normal select-none">Active</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Interactive Selectors -->
  <div class="space-y-4 shrink-0 bg-[var(--color-bg-card)]/40 border border-[var(--color-border-primary)]/80 rounded-2xl p-4">
    <!-- Board Themes List Selector -->
    <div class="flex flex-col gap-2">
      <span class="text-xs text-slate-400 font-semibold tracking-wide">보드 스킨 종류 변경</span>
      <div class="grid grid-cols-1 gap-1.5" role="list" aria-label="보드 테마 목록">
        {#each themes as theme}
          {@const isSelected = activeTheme === theme.name}
          <button
            type="button"
            class="w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/80 {isSelected ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/5' : 'bg-[var(--color-bg-nested)] border-[var(--color-border-primary)]/60 hover:border-slate-500/50 hover:bg-slate-800/25'}"
            aria-pressed={isSelected}
            onclick={() => handleThemeSelect(theme.name)}
          >
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1 border border-slate-950/20 bg-slate-900/40 p-1 rounded-md shrink-0 shadow-inner">
                <span class="w-4 h-4 rounded-[3px] border border-slate-950/20" style="background-color: {theme.light};"></span>
                <span class="w-4 h-4 rounded-[3px] border border-slate-950/20" style="background-color: {theme.dark};"></span>
              </div>
              <span class="text-xs font-bold {isSelected ? 'text-emerald-300' : 'text-slate-200'}">{theme.name}</span>
            </div>
            {#if isSelected}
              <span class="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Check size={9} /> Active
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Piece Styles List Selector (Responsive and request-minimized) -->
    <div class="flex flex-col gap-2 pt-2 border-t border-[var(--color-border-primary)]/40">
      <PieceStyleSelector activeStyle={activeStyle} onSelect={handlePieceStyleSelect} />
    </div>
  </div>

  <!-- EngineSettingsPanel Embedding -->
  <div class="border-t border-[var(--color-border-primary)]/80 pt-5">
    <EngineSettingsPanel />
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

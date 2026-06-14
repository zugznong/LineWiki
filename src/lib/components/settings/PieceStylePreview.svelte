<script lang="ts">
  import { Sparkles } from '@lucide/svelte';
  import { PieceStyle } from '$lib/domain/board/PieceStyle';
  import BoardPiece from '../board/BoardPiece.svelte';

  let { pieceStyle = 'Cburnett' } = $props<{ pieceStyle?: string }>();

  const activeStyle = $derived(PieceStyle.getStyle(pieceStyle));

  const piecesKeys: ('k' | 'q' | 'r' | 'b' | 'n' | 'p')[] = ['k', 'q', 'r', 'b', 'n', 'p'];
</script>

{#key pieceStyle}
  <div class="p-3 bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)] rounded-xl space-y-3 min-w-0 max-w-full box-border" id="piece-style-preview">
    <div class="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
      <Sparkles size={11} class="text-emerald-400 shrink-0" />
      <span class="truncate">체스 기물 스타일 미리보기 ({activeStyle.name})</span>
    </div>

    <div class="space-y-2 min-w-0">
      <!-- 백색 기물 행 (White pieces row) -->
      <div class="flex items-center justify-between bg-[var(--color-bg-panel)]/40 p-2 rounded-lg border border-[var(--color-border-primary)]/30 min-w-0 gap-2">
        <span class="text-[10px] text-slate-400 font-bold font-mono shrink-0 select-none">White (백):</span>
        <div class="flex gap-1 sm:gap-2 overflow-x-auto min-w-0 py-0.5 scrollbar-none scroll-smooth">
          {#each piecesKeys as pType}
            <div class="hover:scale-110 transition duration-150 inline-flex shrink-0">
              <BoardPiece 
                type={pType} 
                color="w" 
                size={26} 
                styleName={pieceStyle}
              />
            </div>
          {/each}
        </div>
      </div>

      <!-- 흑색 기물 행 (Black pieces row) -->
      <div class="flex items-center justify-between bg-[var(--color-bg-panel)]/40 p-2 rounded-lg border border-[var(--color-border-primary)]/30 min-w-0 gap-2">
        <span class="text-[10px] text-slate-400 font-bold font-mono shrink-0 select-none">Black (흑):</span>
        <div class="flex gap-1 sm:gap-2 overflow-x-auto min-w-0 py-0.5 scrollbar-none scroll-smooth">
          {#each piecesKeys as pType}
            <div class="hover:scale-110 transition duration-150 inline-flex shrink-0">
              <BoardPiece 
                type={pType} 
                color="b" 
                size={26} 
                styleName={pieceStyle}
              />
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/key}

<script lang="ts">
  import { Sparkles } from '@lucide/svelte';

  const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
  const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];
</script>

<div class="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3" id="piece-style-preview">
  <div class="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
    <Sparkles size={11} class="text-emerald-400" />
    유니코드 기물 미리보기 (Unicode Engine Symbol preview)
  </div>

  <div class="space-y-2">
    <!-- 백색 기물 행 (White pieces row) -->
    <div class="flex items-center justify-between bg-slate-900/10 p-2 rounded-lg border border-slate-900/30">
      <span class="text-[10px] text-slate-400 font-bold font-mono">White (백):</span>
      <div class="flex gap-2">
        {#each whitePieces as piece}
          <span class="text-xl text-white font-serif select-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.6)] hover:scale-110 transition">{piece}</span>
        {/each}
      </div>
    </div>

    <!-- 흑색 기물 행 (Black pieces row) -->
    <div class="flex items-center justify-between bg-slate-900/10 p-2 rounded-lg border border-slate-900/30">
      <span class="text-[10px] text-slate-400 font-bold font-mono">Black (흑):</span>
      <div class="flex gap-2">
        {#each blackPieces as piece}
          <span class="text-xl text-slate-950 font-serif select-none drop-shadow-[0_1px_1.5px_rgba(255,255,255,0.4)] drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] hover:scale-110 transition">{piece}</span>
        {/each}
      </div>
    </div>
  </div>
</div>

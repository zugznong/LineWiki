<script lang="ts">
  import { BoardTheme } from '$lib/domain/board/BoardTheme';

  // Classic Green 테마 색상 정의 가져오기 혹은 상수 처리
  const classicGreen = BoardTheme.getAllThemes().find(t => t.name === 'Classic Green') || {
    name: 'Classic Green',
    light: '#eeeed2',
    dark: '#769656'
  };

  const miniBoardSize = 4; // 4x4 mini grid for illustrative preview
  const squares = Array.from({ length: miniBoardSize * miniBoardSize }, (_, i) => {
    const r = Math.floor(i / miniBoardSize);
    const c = i % miniBoardSize;
    const isLight = (r + c) % 2 === 0;
    return {
      r,
      c,
      color: isLight ? classicGreen.light : classicGreen.dark,
      isLight
    };
  });
</script>

<div class="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3" id="board-theme-preview">
  <div class="flex items-center justify-between">
    <div class="flex flex-col">
      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">샘플 프리뷰 (Theme Preview)</span>
      <span class="text-xs font-bold text-slate-200">{classicGreen.name}</span>
    </div>
    
    <div class="flex gap-1.5 text-[10px]">
      <div class="flex items-center gap-1">
        <span class="w-2.5 h-2.5 rounded border border-slate-950/20" style="background-color: {classicGreen.light};"></span>
        <span class="text-slate-400">Light</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="w-2.5 h-2.5 rounded border border-slate-950/20" style="background-color: {classicGreen.dark};"></span>
        <span class="text-slate-400">Dark</span>
      </div>
    </div>
  </div>

  <div class="flex justify-center py-2">
    <!-- Mini 4x4 interactive looking chessboard -->
    <div class="grid grid-cols-4 gap-0 rounded border border-slate-900 shadow-xl overflow-hidden w-[112px] h-[112px]">
      {#each squares as sq}
        <div 
          class="w-7 h-7 relative"
          style="background-color: {sq.color};"
        >
          <!-- Illustrative chess dots or details -->
          {#if sq.r === 1 && sq.c === 2}
            <!-- A glowing target guide dot for realism -->
            <div class="absolute inset-2 w-3 h-3 rounded-full bg-emerald-400/75 border border-slate-950/10 shadow animate-pulse"></div>
          {/if}
          {#if sq.r === 2 && sq.c === 1}
            <!-- Representative white mini knight or pawn -->
            <span class="absolute inset-0 flex items-center justify-center text-base text-slate-950 leading-none pointer-events-none drop-shadow">♙</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

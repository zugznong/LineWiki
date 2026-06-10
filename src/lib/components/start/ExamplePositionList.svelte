<script lang="ts">
  import { getChessServices, getStorageServices, getNavigationAdapter } from '$lib/composition/createAppServices';
  import { ArrowRight, BookOpen, ChevronRight } from '@lucide/svelte';

  let { examples = [] } = $props<{
    examples: { name: string; fen: string }[];
  }>();

  function selectExample(fen: string) {
    const chess = getChessServices();
    const storage = getStorageServices();
    const navigation = getNavigationAdapter();

    const destinationPath = chess.createFenUrl.execute(fen);
    if (destinationPath && destinationPath.trim()) {
      storage.startLineSession.execute();
      storage.clearLineHistory.execute();
      navigation.goto(destinationPath);
    } else {
      console.warn(`[포지션 이동 오류] 유효하지 않은 FEN 표현식으로 인해 URL 생성이 차단되었습니다: FEN="${fen}"`);
    }
  }
</script>

<div class="max-w-xl mx-auto space-y-3" id="example-position-list">
  <div class="flex items-center gap-2 px-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">
    <BookOpen size={13} />
    연구용 추천 오프닝 / 엔드게임 예제
  </div>

  <div class="grid gap-2.5">
    {#each examples as item}
      <button
        onclick={() => selectExample(item.fen)}
        class="w-full bg-[var(--color-bg-card)]/45 hover:bg-[var(--color-bg-panel)]/90 border border-[var(--color-border-primary)]/80 hover:border-[var(--color-border-secondary)]/80 rounded-xl p-4 flex items-center justify-between text-left transition hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
      >
        <div class="space-y-1 pr-4">
          <div class="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition">
            {item.name}
          </div>
          <div class="text-xs text-slate-500 font-mono truncate max-w-xs md:max-w-md">
            {item.fen}
          </div>
        </div>
        <div class="text-slate-600 group-hover:text-emerald-400 transition shrink-0">
          <ChevronRight size={18} />
        </div>
      </button>
    {/each}
  </div>
</div>

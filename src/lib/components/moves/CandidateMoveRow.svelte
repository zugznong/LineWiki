<script lang="ts">
  import LocalEvalCell from './LocalEvalCell.svelte';

  let { uci, san, index, onclick } = $props<{
    uci: string;
    san: string;
    index: number;
    onclick: () => void;
  }>();

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick();
    }
  }
</script>

<div 
  class="candidate-move-row hover:bg-slate-900/50 group transition-all duration-150 cursor-pointer select-none border-b border-slate-900/40 last:border-0 hover:pl-5 focus:bg-slate-900/60 focus:outline-none"
  {onclick}
  onkeydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label="후보수 {index + 1}: {san}, uci {uci}"
  id="candidate-row-{uci}"
  data-uci={uci}
  title="UCI: {uci}"
>
  <div class="px-4 py-3 flex items-center justify-between">
    
    <!-- 좌측 영역: 대응 수 (SAN) -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-extrabold text-slate-100 group-hover:text-emerald-400 transition font-sans">
        {san}
      </span>
    </div>

    <!-- 우측 영역: 로컬 평가 영역 -->
    <div class="shrink-0 text-right">
      <LocalEvalCell {uci} />
    </div>

  </div>
</div>

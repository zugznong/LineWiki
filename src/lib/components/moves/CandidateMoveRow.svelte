<script lang="ts">
  import LocalEvalCell from './LocalEvalCell.svelte';
  import type { EngineMoveEvaluation, MergedMoveEvaluation } from '../../domain/analysis/AnalysisTypes';
  import { getEvalScoreValue } from '../../domain/analysis/CandidateMoveSortPolicy';
  import { ShieldAlert, Swords, Trophy } from '@lucide/svelte';

  let { uci, san, index, evaluation, sortingEvaluation, onclick, compact = false } = $props<{
    uci: string;
    san: string;
    index: number;
    evaluation: EngineMoveEvaluation | MergedMoveEvaluation | undefined;
    sortingEvaluation: EngineMoveEvaluation | MergedMoveEvaluation | undefined;
    onclick: () => void;
    compact?: boolean;
  }>();

  // 중요 수 판정
  const isCheck = $derived(san.includes('+') || san.includes('#'));
  const isCapture = $derived(san.includes('x'));
  const isPromotion = $derived(san.includes('=') || uci.length > 4);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick();
    }
  }

  const sortScore = $derived(getEvalScoreValue(sortingEvaluation));
</script>

<div 
  class="candidate-move-row-shell hover:bg-[var(--color-bg-panel)]/50 group transition-all duration-150 cursor-pointer select-none border-b border-[var(--color-border-primary)]/40 last:border-0 focus:bg-[var(--color-bg-panel)]/80 focus:outline-none"
  {onclick}
  onkeydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label="후보수 {index + 1}: {san}, uci {uci}"
  id="candidate-row-{uci}"
  data-uci={uci}
  data-rank={index + 1}
  data-score={evaluation?.score ? evaluation.score.format() : ''}
  data-sort-score={sortScore !== null ? sortScore : ''}
  data-source={evaluation ? ('source' in evaluation ? (evaluation as any).source : 'local') : ''}
  title="UCI: {uci}"
>
  <div class="{compact ? 'px-2.5 py-1' : 'px-4 py-3'} flex items-center justify-between">
    
    <!-- 좌측 영역: 대응 수 (SAN) -->
    <div class="flex items-center gap-2 transition-transform duration-150 group-hover:translate-x-1.5">
      {#if !compact}
        <span class="text-[10px] font-mono text-[var(--color-text-inactive)] w-3 text-right">
          {index + 1}
        </span>
      {/if}

      <span class="{compact ? 'text-[13px]' : 'text-sm'} font-extrabold text-slate-100 group-hover:text-emerald-400 transition font-sans flex items-center gap-1.5 flex-wrap">
        <span>{san}</span>
        
        {#if isCheck}
          <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 uppercase tracking-wide shrink-0">
            <ShieldAlert size={9} class="shrink-0 text-amber-400" />
            <span>Check</span>
          </span>
        {/if}
        {#if isCapture}
          <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 uppercase tracking-wide shrink-0">
            <Swords size={9} class="shrink-0 text-emerald-400" />
            <span>Cap</span>
          </span>
        {/if}
        {#if isPromotion}
          <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-0.5 uppercase tracking-wide shrink-0">
            <Trophy size={9} class="shrink-0 text-sky-400" />
            <span>Promo</span>
          </span>
        {/if}
      </span>
    </div>

    <!-- 우측 영역: 로컬 평가 영역 -->
    <div class="shrink-0 text-right">
      <LocalEvalCell {uci} {evaluation} {compact} />
    </div>

  </div>
</div>

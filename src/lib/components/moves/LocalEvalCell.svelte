<script lang="ts">
  import type { EngineMoveEvaluation, MergedMoveEvaluation } from '../../domain/analysis/AnalysisTypes';
  import { ShieldAlert, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';

  let { uci, evaluation, compact = false } = $props<{ 
    uci: string; 
    evaluation: EngineMoveEvaluation | MergedMoveEvaluation | undefined;
    compact?: boolean; 
  }>();

  const score = $derived(evaluation?.score);
  const depth = $derived(evaluation?.depth);
  const source = $derived(evaluation && 'source' in evaluation ? evaluation.source : 'local');

  const status = $derived(localAnalysisStore.status);
  const isAnalyzing = $derived(status === 'analyzing' || status === 'fallback-running');
  const isUnavailable = $derived(localAnalysisStore.isEvaluationUnavailableForMove(uci));

  const formattedText = $derived(score ? score.format() : '...');
  const isMate = $derived(score?.isMate() || false);
  const isCp = $derived(score?.isCp() || false);
  const numericValue = $derived(score?.value ?? 0);

  // 반응형 배지 컬러링 공식 정의
  const badgeClasses = $derived(() => {
    if (!score) {
      if (isAnalyzing) {
        return 'bg-sky-500/5 text-sky-400 border border-sky-500/25 font-medium';
      }
      if (isUnavailable) {
        return 'bg-rose-500/5 text-rose-500 border border-rose-500/25 font-medium';
      }
      return 'bg-[var(--color-bg-nested)] text-slate-500 border border-[var(--color-border-primary)]/40';
    }

    if (source === 'db') {
      return 'bg-sky-500/10 text-sky-400 border border-sky-500/25';
    }

    if (source === 'fallback') {
      return 'bg-amber-500/5 text-amber-500/90 border border-amber-500/30';
    }

    let base = '';
    if (isMate) {
      if (numericValue > 0) {
        base = 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-extrabold';
      } else {
        base = 'bg-rose-950/40 text-rose-400 border border-rose-900/30 font-extrabold';
      }
    } else if (numericValue > 20) {
      base = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
    } else if (numericValue < -20) {
      base = 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
    } else {
      base = 'bg-[var(--color-bg-card)] text-slate-300 border border-[var(--color-border-primary)]/60';
    }

    if (source === 'provisional' || source === 'previous-line') {
      return `${base} opacity-75 border-dashed`;
    }
    return base;
  });
</script>

<div class="inline-flex items-center {compact ? 'gap-1 text-[11px]' : 'gap-1.5 text-xs'} font-mono" id="eval-cell-{uci}">
  <span 
    class="inline-flex items-center gap-1 {compact ? 'px-1.5 py-0.5 rounded-md text-[10px]' : 'px-2.5 py-1 rounded-lg text-[11px]'} font-semibold transition-all duration-300 {badgeClasses()}"
    title={score ? (
      source === 'db' ? '저장된 DB 평가치' : 
      source === 'fallback' ? '로컬 엔진 가동 실패로 인한 대체 휴리스틱 계산 (정확한 Stockfish 평가 아님 - 낮은 신뢰도)' : 
      (source === 'provisional' || source === 'previous-line') ? '직전 포지션 후보수 평가 기반 임시값, 새 분석 대기 중' :
      `로컬 엔진 산출 스코어 (Depth ${depth})`
    ) : (isAnalyzing ? '로컬 분석이 진행 중입니다' : (isUnavailable ? '분석 불가 상태' : '분석 대기 중'))}
  >
    {#if score}
      {#if isMate}
        <ShieldAlert size={10} class="shrink-0 text-amber-400" />
      {:else if numericValue > 20}
        <TrendingUp size={10} class="shrink-0 text-emerald-400" />
      {:else if numericValue < -20}
        <TrendingDown size={10} class="shrink-0 text-rose-400" />
      {/if}
      <span>{formattedText}</span>
    {:else}
      {#if isAnalyzing}
        <span class="text-sky-400 font-medium tracking-tight">분석 중</span>
      {:else if isUnavailable}
        <span class="text-rose-500 font-medium tracking-tight">분석 불가</span>
      {:else}
        <span class="text-slate-500 font-medium tracking-tight">...</span>
      {/if}
    {/if}
  </span>
  
  {#if score}
    {#if source === 'db'}
      <span class="text-[9px] text-sky-500 font-bold shrink-0 lowercase" title="위키 수순 DB 기반">
        db
      </span>
    {:else if source === 'fallback'}
      <span class="text-[9px] text-amber-500/80 font-bold shrink-0 lowercase italic flex items-center gap-0.5" title="로컬 엔진 가동 실패로 인한 대체 계산 (낮은 신뢰도)">
        fallback (낮은 신뢰도)
      </span>
    {:else if source === 'provisional' || source === 'previous-line'}
      <span class="text-[9px] text-teal-400 font-bold shrink-0 lowercase italic" title="직전 포지션 후보수 평가 기반 임시값, 새 분석 대기 중">
        prev
      </span>
    {:else if depth}
      <span class="text-[9px] text-slate-600 font-bold shrink-0 lowercase" title="로컬 Stockfish 깊이">
        d{depth}
      </span>
    {/if}
  {/if}
</div>

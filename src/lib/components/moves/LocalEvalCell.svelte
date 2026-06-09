<script lang="ts">
  import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
  import { ShieldAlert, TrendingUp, TrendingDown } from '@lucide/svelte';

  let { uci } = $props<{ uci: string }>();

  const evaluation = $derived(localAnalysisStore.getEvaluationForMove(uci));
  const score = $derived(evaluation?.score);
  const depth = $derived(evaluation?.depth);

  const formattedText = $derived(score ? score.format() : '...');
  const isMate = $derived(score?.isMate() || false);
  const isCp = $derived(score?.isCp() || false);
  const numericValue = $derived(score?.value ?? 0);

  // 반응형 배지 컬러링 공식 정의
  const badgeClasses = $derived(() => {
    if (!score) {
      return 'bg-slate-900 text-slate-500 border border-slate-800/40';
    }
    if (isMate) {
      if (numericValue > 0) {
        return 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-extrabold animate-[pulse_2s_infinite]';
      } else {
        return 'bg-rose-950/40 text-rose-400 border border-rose-900/30 font-extrabold';
      }
    }
    
    // 점수가 cp인 경우
    if (numericValue > 20) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
    } else if (numericValue < -20) {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
    } else {
      return 'bg-slate-800 text-slate-300 border border-slate-700/60';
    }
  });
</script>

<div class="inline-flex items-center gap-1.5 font-mono text-xs" id="eval-cell-{uci}">
  <span 
    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-300 {badgeClasses()}"
    title={score ? `로컬 엔진 산출 스코어 (Depth ${depth})` : '분석 대기 중'}
  >
    {#if score}
      {#if isMate}
        <ShieldAlert size={11} class="shrink-0 text-amber-400" />
      {:else if numericValue > 20}
        <TrendingUp size={11} class="shrink-0 text-emerald-400" />
      {:else if numericValue < -20}
        <TrendingDown size={11} class="shrink-0 text-rose-400" />
      {/if}
      <span>{formattedText}</span>
    {:else}
      <span class="text-slate-500 font-medium tracking-tight">...</span>
    {/if}
  </span>
  
  {#if score && depth}
    <span class="text-[9px] text-slate-600 font-bold shrink-0 lowercase" title="탐색 분석 깊이(Depth)">
      d{depth}
    </span>
  {/if}
</div>

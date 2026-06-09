<script lang="ts">
  import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { Cpu, Zap, Award, Activity } from '@lucide/svelte';
  import type { EngineMoveEvaluation } from '$lib/domain/analysis/AnalysisTypes';
  import type { EvalScore } from '$lib/domain/analysis/EvalScore';

  const status = $derived(localAnalysisStore.status);
  const errorMessage = $derived(localAnalysisStore.errorMessage);
  const evaluations = $derived(localAnalysisStore.evaluations);
  const candidateMoves = $derived(localAnalysisStore.candidateMoves);
  
  // Calculate best move based on evaluations
  const bestMove = $derived.by(() => {
    const evalEntries = Object.values(evaluations);
    
    // 후보수별 평가가 충분히 수집된 뒤에만 보드 상 최고 가치를 산정합니다
    if (candidateMoves.length === 0 || evalEntries.length < candidateMoves.length) {
      return null;
    }
    
    const turn = positionStore.current?.fen.split(' ')[1] || 'w';
    
    // Sort evaluations depending on whose turn it is
    // White wants highest score, Black wants lowest score
    const sorted = [...evalEntries]
      .filter((e): e is EngineMoveEvaluation & { score: EvalScore } => e.score !== null)
      .sort((a, b) => {
        // Mate dominates Cp
        const valA = a.score.isMate() ? (a.score.value > 0 ? 10000 + a.score.value : -10000 + a.score.value) : a.score.value;
        const valB = b.score.isMate() ? (b.score.value > 0 ? 10000 + b.score.value : -10000 + b.score.value) : b.score.value;
        return turn === 'w' ? valB - valA : valA - valB;
      });
    
    return sorted[0] || null;
  });

  // Calculate highest depth achieved
  const maxDepth = $derived.by(() => {
    const depths = Object.values(evaluations).map(e => e.depth);
    return depths.length > 0 ? Math.max(...depths) : 0;
  });
</script>

<div class="flex-1 flex flex-col h-full bg-slate-900/10 min-h-0" id="engine-panel">
  
  <!-- 상단 스테이터스 파트 -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-slate-950/20 shrink-0">
    <div class="flex items-center gap-2 text-xs font-bold text-slate-300">
      <Cpu size={14} class={status === 'analyzing' ? 'text-emerald-400 animate-spin' : 'text-slate-500'} />
      {#if status === 'error'}
        <span class="text-rose-400">엔진 로드 실패 (WASM 미배포)</span>
      {:else if status === 'analyzing'}
        <span>임시 로컬 평가기 (분석 중)</span>
      {:else if status === 'completed'}
        <span>임시 로컬 평가기 (분석 완료)</span>
      {:else}
        <span>임시 로컬 평가기 (대기 중)</span>
      {/if}
    </div>

    <!-- Active calculating status dot -->
    <div class="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
      <span>Mock Heuristics</span>
      <span class="relative flex h-2 w-2">
        {#if status === 'analyzing'}
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        {/if}
        <span class="relative inline-flex rounded-full h-2 w-2" 
          class:bg-emerald-500={status === 'analyzing'} 
          class:bg-amber-400={status === 'ready'} 
          class:bg-slate-600={status === 'idle'}
          class:bg-rose-500={status === 'error'}
        ></span>
      </span>
    </div>
  </div>

  <!-- 분석 계기판 대시보드 메타 정보 영역 (Depth, Best MOVE, Status) -->
  {#if status !== 'idle' && status !== 'error'}
    <div class="px-4 py-3 bg-slate-950/40 border-b border-slate-900 grid grid-cols-2 gap-3 shrink-0" id="engine-metrics-box">
      
      <!-- 도달 최장 Depth -->
      <div class="flex items-center gap-2 bg-slate-900/40 border border-slate-800/60 p-2 rounded-lg">
        <Activity size={14} class="text-emerald-400" />
        <div class="flex flex-col select-none">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Depth</span>
          <span class="text-xs font-extrabold text-slate-200 font-mono">
            {#if bestMove && maxDepth > 0}
              {maxDepth} plies (Mock)
            {:else}
              분석 중...
            {/if}
          </span>
        </div>
      </div>

      <!-- 실시간 추천 Best Line 정보 -->
      <div class="flex items-center gap-2 bg-slate-900/40 border border-slate-800/60 p-2 rounded-lg">
        <Award size={14} class="text-amber-400" />
        <div class="flex flex-col select-none">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Best Move</span>
          <span class="text-xs font-mono font-extrabold text-slate-100">
            {#if bestMove}
              <span class="text-emerald-400">{bestMove.moveSan}</span>
              <span class="text-[10px] text-slate-500 font-normal">({bestMove.score.format()})</span>
            {:else}
              분석 중...
            {/if}
          </span>
        </div>
      </div>

    </div>
  {:else if status === 'error'}
    <!-- 에러 경고 배너 -->
    <div class="mx-4 my-2 p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-start gap-2.5 shrink-0" id="engine-error-alert">
      <div class="bg-rose-500/10 p-1 rounded text-rose-400">
        <Cpu size={14} />
      </div>
      <div class="flex-1 space-y-0.5">
        <h5 class="text-xs font-bold text-rose-300">엔진 모듈 로드 실패</h5>
        <p class="text-[10px] text-rose-400/80 leading-relaxed">{errorMessage || 'WASM 배포 파일이 준비되지 않았거나 보안 제약으로 간이 분석 엔진 기동이 취소되었습니다.'}</p>
      </div>
    </div>
  {/if}

  <!-- 현재 분석 요약 영역 -->
  <div class="flex-1 flex flex-col overflow-y-auto px-4 py-4 space-y-4 min-h-0 scrollbar-thin" id="engine-summary-area">
    <div class="flex flex-col gap-1 select-none">
      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">실시간 수집 현황</h4>
      <p class="text-[11px] text-slate-500 leading-normal">구동 중인 임시 로컬 Heuristics Mock 연산을 거쳐 모든 합법적 대응 수들을 순차 평가합산하고 있습니다.</p>
    </div>

    <!-- 진행 상황 파이/게이지 플로우 -->
    {#if status === 'analyzing'}
      <div class="bg-slate-950/30 border border-slate-900 p-3 rounded-xl space-y-2">
        <div class="flex justify-between items-center text-xs">
          <span class="text-slate-400 font-medium">연산 완료 흐름</span>
          <span class="font-mono font-bold text-emerald-400">
            {Object.keys(evaluations).length} / {candidateMoves.length}
          </span>
        </div>
        <div class="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
          <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" 
               style="width: {candidateMoves.length > 0 ? (Object.keys(evaluations).length / candidateMoves.length) * 100 : 0}%">
          </div>
        </div>
      </div>
    {:else if status === 'completed'}
      <div class="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
        <Zap size={14} />
        <span>현재 포지션의 모든 후보 수에 대한 분석을 완수했습니다.</span>
      </div>
    {:else}
      <div class="bg-slate-950/30 border border-slate-900 p-4 rounded-xl text-xs text-slate-500 text-center">
        체스 게임을 진행하면 엔진 분석이 실시간으로 시작됩니다.
      </div>
    {/if}

    <!-- 분석 요약 리스트 -->
    {#if Object.keys(evaluations).length > 0}
      <div class="space-y-2 select-none" id="engine-best-recommendations">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">최적 추천 대응 수 (우수 순서)</span>
        <div class="divide-y divide-slate-900/50 bg-slate-950/20 border border-slate-900/80 rounded-xl overflow-hidden">
          {#each Object.values(evaluations)
            .filter((e): e is EngineMoveEvaluation & { score: EvalScore } => e.score !== null)
            .sort((a, b) => {
              const turn = positionStore.current?.fen.split(' ')[1] || 'w';
              const valA = a.score.isMate() ? (a.score.value > 0 ? 10000 + a.score.value : -10000 + a.score.value) : a.score.value;
              const valB = b.score.isMate() ? (b.score.value > 0 ? 10000 + b.score.value : -10000 + b.score.value) : b.score.value;
              return turn === 'w' ? valB - valA : valA - valB;
            }) as item, idx}
            <div class="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[9px] text-slate-600 font-bold w-4">{idx + 1}.</span>
                <span class="font-mono font-bold text-slate-200 bg-slate-900/60 border border-slate-800/40 px-1.5 py-0.5 rounded text-[11px] min-w-[42px] text-center">{item.moveSan}</span>
                <span class="text-[10px] text-slate-500 font-mono">({item.moveUci})</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-slate-400 font-mono pl-2">depth {item.depth}</span>
                <span class="font-mono px-2 py-0.5 rounded font-bold text-[11px] {(!item.score.isMate() && item.score.value >= 0) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                  {item.score.format()}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

</div>

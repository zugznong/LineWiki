<script lang="ts">
  import CandidateMoveRow from './CandidateMoveRow.svelte';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';
  import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
  import { evaluationStore } from '$lib/stores/evaluationStore.svelte.ts';
  import { sortCandidateMoves } from '$lib/domain/analysis/CandidateMoveSortPolicy';

  const services = createAppServices();
  const currentPosition = $derived(positionStore.current);
  
  // 합법 후보수 목록을 positionStore로부터 가져옵니다.
  const moves = $derived(positionStore.candidateMoves);

  // 병합 평가치 전체를 한 번만 리액티브하게 인출해 렌더 갱신 범위를 좁힙니다.
  const evaluations = $derived(evaluationStore.mergedEvaluations);

  // 평가치를 바로 정렬에 쓰지 않고 디바운스 처리된 상태로 교체합니다.
  let debouncedEvaluations = $state<Record<string, any>>({});

  $effect(() => {
    const currentEvals = evaluations;
    const timeout = setTimeout(() => {
      debouncedEvaluations = { ...currentEvals };
    }, 50);

    return () => {
      clearTimeout(timeout);
    };
  });

  // 뷰포트 반응형 설정
  const isLowHeight = $derived(viewportStore.isLowHeightDesktop);
  const isCompact = $derived(viewportStore.isCompactDesktop);
  const useCompactMode = $derived(isLowHeight || isCompact);

  // 정렬 모드: 'engine' | 'tactical' | 'natural'
  let sortMode = $state<'engine' | 'tactical' | 'natural'>('engine');

  // 처리된 무브 목록 (정렬 상태 반영)
  const processedMoves = $derived.by(() => {
    const turn = currentPosition?.activeColor || 'w';
    return sortCandidateMoves(moves, debouncedEvaluations, turn, sortMode);
  });

  function toggleSortMode() {
    if (sortMode === 'engine') {
      sortMode = 'tactical';
    } else if (sortMode === 'tactical') {
      sortMode = 'natural';
    } else {
      sortMode = 'engine';
    }
  }

  function handleMoveClick(from: string, to: string, promotion: string | null) {
    if (!currentPosition) return;
    const playRes = services.playMove.execute(
      currentPosition.fen,
      from,
      to,
      promotion || undefined
    );

    if (playRes.isOk()) {
      const moveResult = playRes.unwrap();
      services.navigateMove.execute(moveResult);
    }
  }
</script>

<div class="flex flex-col h-full overflow-hidden min-h-0" id="candidate-move-container">
  
  <!-- 상단 메타 인포 뷰 영역 (전체 후보수 및 현재 표시 방식 가이드) -->
  <div class="px-3 {useCompactMode ? 'py-1' : 'py-1.5'} bg-[var(--color-bg-nested)] border-b border-[var(--color-border-primary)] shrink-0 flex items-center justify-between text-[10px] text-slate-400 select-none" id="candidate-meta-info">
    <div class="flex items-center gap-1">
      <span class="font-semibold text-slate-500">후보수:</span>
      <span class="font-bold text-slate-200">{moves.length}개</span>
      {#if sortMode === 'engine'}
        <span class="text-[9px] text-slate-500/80 ml-1 bg-[var(--color-bg-panel)] px-1.5 py-0.5 rounded border border-[var(--color-border-primary)]/30">* 분석 점수는 약간 지연되어 정렬됩니다</span>
      {/if}
    </div>
    <div class="flex items-center gap-1.5 font-bold">
      <button 
        class="hover:text-emerald-400 active:scale-95 transition flex items-center gap-0.5"
        onclick={toggleSortMode}
        title="정렬 방식을 전환합니다. 분석 점수는 약간 지연되어 정렬됩니다 (평가치 순 / 전술 우선 / 기본 순)"
      >
        <span class="text-[9px] uppercase tracking-wide opacity-80">
          {#if sortMode === 'engine'}
            평가치 순
          {:else if sortMode === 'tactical'}
            전술 우선
          {:else}
            기본 순
          {/if}
        </span>
        <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {#if sortMode === 'engine'}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          {:else if sortMode === 'tactical'}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          {/if}
        </svg>
      </button>
    </div>
  </div>
  
  <!-- 테이블형 컬럼 헤더 영역 정의 (Columns Header) -->
  <div class="px-4 py-2 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] shrink-0 flex items-center justify-between text-[11px] font-bold text-slate-400 select-none uppercase tracking-wider">
    <div class="flex items-center">
      <span>Move</span>
    </div>
    <div class="text-right">
      <span>Local Eval</span>
    </div>
  </div>

  <!-- 합법수 세부 리스트 목록 (블록 스크롤 처리) -->
  <div class="flex-1 overflow-y-auto scrollbar-thin divide-y divide-[var(--color-border-primary)]/20" id="candidate-move-list">
    {#if processedMoves.length === 0}
      <div class="flex flex-col items-center justify-center text-center text-slate-500 py-16 px-4 gap-2">
        <svg class="h-8 w-8 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 2 0 002-2v-6a2 2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span class="text-xs font-semibold">체크메이트 상태이거나 분기 라인이 정체되었습니다.</span>
        <span class="text-[10px] text-slate-600">더 이상 전개 가능한 새로운 합법 후보수가 발견되지 않았습니다.</span>
      </div>
    {:else}
      {#each processedMoves as m, i}
        <CandidateMoveRow 
          uci={m.uci}
          san={m.san}
          index={i}
          compact={useCompactMode}
          evaluation={evaluations[m.uci]}
          onclick={() => handleMoveClick(m.from, m.to, m.promotion)}
        />
      {/each}
      {#if processedMoves.length > 6}
        <div class="px-4 py-1.5 text-center text-[9px] text-slate-500 bg-[var(--color-bg-nested)] select-none border-t border-[var(--color-border-primary)]/10 shrink-0">
          마우스 스크롤하여 더 많은 합법 후보수({processedMoves.length}개)를 확인할 수 있습니다.
        </div>
      {/if}
    {/if}
  </div>
  
</div>

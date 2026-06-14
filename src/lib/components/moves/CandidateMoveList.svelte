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
  const completedDepth = $derived(localAnalysisStore.completedFrameDepth);

  // 로컬 분석용 디바운스된 평가치 (completed depth 프레임이 안착했을 때만 업데이트)
  let debouncedLocalEvaluations = $state<Record<string, any>>({});
  let lastCompletedDepth = $state<number | null>(null);

  const activeFen = $derived(evaluationStore.activeFen);
  const activeGeneration = $derived(evaluationStore.generation);

  let prevFen = $state<string>('');
  let prevGen = $state<number>(0);

  // 단 하나의 이펙트를 사용해 정렬 타이머 및 FEN 교체 정화를 통합 통제합니다.
  $effect(() => {
    const fen = activeFen;
    const gen = activeGeneration;
    const depth = completedDepth;
    const currentEvals = evaluations;
    const isFallbackMode = localAnalysisStore.engineMode === 'fallback';

    // 1. FEN 혹은 세션 세대가 전격 전환되었을 때는 즉각 정렬 대상을 청소합니다.
    if (fen !== prevFen || gen !== prevGen) {
      prevFen = fen;
      prevGen = gen;
      debouncedLocalEvaluations = {};
      lastCompletedDepth = null;
      return;
    }

    // 2. 만약 fallback 모드라면 속도 가치 극대화를 위해 디바운스 없이 로컬/fallback 평가치를 즉시 직결 반영합니다.
    if (isFallbackMode) {
      const localOnly = Object.fromEntries(
        Object.entries(currentEvals).filter(([_, ev]) => ev?.source === 'local' || ev?.source === 'fallback')
      );
      debouncedLocalEvaluations = localOnly;
      return;
    }

    // 3. 로컬 분석 MultiPV 완성 프레임 깊이가 갱신 지점을 통과한 경우에만 50ms 정전 디바운스를 반영해 화면 떨림을 방지합니다.
    if (depth !== null && depth !== lastCompletedDepth) {
      lastCompletedDepth = depth;
      
      const timeout = setTimeout(() => {
        const localOnly = Object.fromEntries(
          Object.entries(currentEvals).filter(([_, ev]) => ev?.source === 'local')
        );
        debouncedLocalEvaluations = localOnly;
      }, 50);

      return () => {
        clearTimeout(timeout);
      };
    }
  });

  // DB/fallback/local 평가 모두 후보수 정렬에 통합 유지하되, local MultiPV의 흔들림만 완성 프레임 기준으로 debounce 처리
  const stableSortingEvaluations = $derived.by(() => {
    const currentEvals = evaluations;
    const sortedMap: Record<string, any> = {};

    for (const [uci, ev] of Object.entries(currentEvals)) {
      if (!ev) continue;

      if (ev.source === 'db' || ev.source === 'fallback') {
        // DB 및 즉시 반영 폴백 평가는 실시간 완전 동기화
        sortedMap[uci] = ev;
      } else if (ev.source === 'local') {
        const debouncedEv = debouncedLocalEvaluations[uci];
        if (debouncedEv) {
          // 완성 프레임 시점의 고정된 점수를 정렬 지연 지표로 삼아 떨림 예방
          sortedMap[uci] = debouncedEv;
        } else {
          // 만약 디바운스된 기록이 없다면 (초기 기동 혹은 첫 연산 수), 정렬에서 누락되어 하위 방치되는 경우 예외 조치로 실시간 기재
          sortedMap[uci] = ev;
        }
      }
    }

    return sortedMap;
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
    const status = localAnalysisStore.status;
    
    if (
      status === 'fallback-disabled' ||
      status === 'fallback-failed' ||
      status === 'analysis-unavailable'
    ) {
      return sortCandidateMoves(moves, {}, turn, 'natural');
    }
    return sortCandidateMoves(moves, stableSortingEvaluations, turn, sortMode);
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

  function handleMoveClick(uci: string, from: string, to: string, promotion: string | null) {
    if (!currentPosition) return;

    // 수 입력 직후 이전 평가를 기억해 둡니다.
    localAnalysisStore.rememberLastSelectedMoveEvaluation(uci);

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

<div class="flex flex-col h-full max-h-full overflow-hidden min-h-0" id="candidate-move-container">
  
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
      {#each processedMoves as m, i (m.uci)}
        <CandidateMoveRow 
          uci={m.uci}
          san={m.san}
          index={i}
          compact={useCompactMode}
          evaluation={evaluations[m.uci]}
          sortingEvaluation={stableSortingEvaluations[m.uci]}
          onclick={() => handleMoveClick(m.uci, m.from, m.to, m.promotion)}
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

<script lang="ts">
  import CandidateMoveRow from './CandidateMoveRow.svelte';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { createAppServices } from '$lib/composition/createAppServices';

  const services = createAppServices();
  const currentPosition = $derived(positionStore.current);
  
  // 합법 후보수 목록을 positionStore로부터 가져옵니다.
  const moves = $derived(positionStore.candidateMoves);

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

<div class="flex flex-col h-full overflow-hidden" id="candidate-move-container">
  
  <!-- 테이블형 컬럼 헤더 영역 정의 (Columns Header) -->
  <div class="px-4 py-2 border-b border-slate-900 bg-slate-950/70 shrink-0 flex items-center justify-between text-[11px] font-bold text-slate-400 select-none uppercase tracking-wider">
    <div class="flex items-center">
      <span>Move</span>
    </div>
    <div class="text-right">
      <span>Local Eval</span>
    </div>
  </div>

  <!-- 합법수 세부 리스트 목록 (블록 스크롤 처리) -->
  <div class="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-900/30" id="candidate-move-list">
    {#if moves.length === 0}
      <div class="flex flex-col items-center justify-center text-center text-slate-500 py-16 px-4 gap-2">
        <svg class="h-8 w-8 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 2 0 002-2v-6a2 2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span class="text-xs font-semibold">체크메이트 상태이거나 분기 라인이 정체되었습니다.</span>
        <span class="text-[10px] text-slate-600">더 이상 전개 가능한 새로운 합법 후보수가 발견되지 않았습니다.</span>
      </div>
    {:else}
      {#each moves as m, i}
        <CandidateMoveRow 
          uci={m.uci}
          san={m.san}
          index={i}
          onclick={() => handleMoveClick(m.from, m.to, m.promotion)}
        />
      {/each}
    {/if}
  </div>
  
</div>

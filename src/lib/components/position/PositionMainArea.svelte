<script lang="ts">
  import Board from '../board/Board.svelte';
  import BoardSettingsButton from '../board/BoardSettingsButton.svelte';
  import CandidateMoveList from '../moves/CandidateMoveList.svelte';
  import MoveHistoryStrip from '../moves/MoveHistoryStrip.svelte';
  import SidePanel from '../panels/SidePanel.svelte';
  import BottomPanel from '../panels/BottomPanel.svelte';

  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';

  const isDesktop = $derived(viewportStore.isDesktop);
  const isLowHeight = $derived(viewportStore.isLowHeightDesktop);
  const isCompact = $derived(viewportStore.isCompactDesktop);
  const useCompactMode = $derived(isLowHeight || isCompact);
  const useThreeColumnLayout = $derived(viewportStore.isDesktop && viewportStore.width >= 1200);
</script>

<div class="flex-1 {useCompactMode ? 'p-2 md:p-3' : 'p-3 md:p-5'} overflow-hidden flex flex-col min-h-0" id="position-main-area">
  {#if useThreeColumnLayout}
    <!-- 데스크톱 3열 레이아웃 (Layout for Desktop >= 1024px) -->
    <div class="flex-1 flex flex-row {useCompactMode ? 'gap-3' : 'gap-5'} overflow-hidden min-h-0" id="desktop-3-column-layout">
      
      <!-- 1열: 체스 보드 (Column 1: Interactive Board) -->
      <div class="flex-1 flex flex-col {useCompactMode ? 'gap-2 p-2.5' : 'gap-3 p-4'} min-h-0 bg-[var(--color-bg-panel)]/5 rounded-2xl border border-[var(--color-border-primary)]/40">
        <div class="flex items-center justify-between shrink-0 mb-1" id="board-toolbar-area">
          <span class="text-xs font-semibold text-slate-400 {isLowHeight ? 'scale-90 origin-left' : ''}">인터랙티브 연구 및 포지션 분석</span>
          <BoardSettingsButton />
        </div>
        <div class="flex-1 flex items-center justify-center min-h-0">
          <Board />
        </div>
        <MoveHistoryStrip />
      </div>

      <!-- 2열: 합법 후보수 목록 (Column 2: Candidate Moves) -->
      <div 
        id="desktop-candidate-col"
        class="shrink-0 flex flex-col {useCompactMode ? 'gap-2' : 'gap-4'} min-h-0 border border-[var(--color-border-primary)]/80 bg-[var(--color-bg-surface)] rounded-xl overflow-hidden"
        style="width: {useCompactMode ? '250px' : 'var(--col2-width, 320px)'}"
      >
        <div class="px-3 py-2 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-nested)] shrink-0">
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">주변 합법 후보수 (Candidate)</h3>
        </div>
        <div class="flex-1 min-h-0">
          <CandidateMoveList />
        </div>
      </div>

      <!-- 3열: 정밀 분석 패널 탭 (Column 3: Fine Analysis Panels) -->
      <div 
        class="shrink-0 flex flex-col min-h-0" 
        id="desktop-side-panel-col"
        style="width: {useCompactMode ? '310px' : 'var(--col3-width, 385px)'}"
      >
        <SidePanel />
      </div>
      
    </div>
  {:else}
    <!-- 모바일/태블릿 단일 흐름 레이아웃 (Single Vertical Flow for Mobile & Tablet) -->
    <div class="flex-1 flex flex-col overflow-y-auto gap-4 scrollbar-thin select-none min-h-0" id="mobile-single-flow-layout">
      
      <div class="flex items-center justify-between px-1 shrink-0" id="mobile-board-toolbar">
        <span class="text-xs font-bold text-slate-400">체스 기기 제어</span>
        <BoardSettingsButton />
      </div>

      <!-- 보드 영역 (정방형 자동 스케일링 유도) -->
      <div id="mobile-board-card" class="flex flex-col items-center justify-center p-3 bg-[var(--color-bg-panel)]/15 border border-[var(--color-border-primary)] rounded-2xl shrink-0">
        <Board />
      </div>

      <MoveHistoryStrip />

      <!-- 모바일 설명 편의 구문 영역 -->
      <div class="flex items-center justify-start shrink-0 px-1 py-1">
        <span class="text-xs text-slate-400 font-medium">체스판 기물을 탭하여 새로운 라인을 전개하세요.</span>
      </div>

      <!-- 확장 수순 및 후보수 (모바일 단일 흐름 통합 뷰) -->
      <div class="shrink-0 min-h-[220px] max-h-[380px] h-[30vh]" id="mobile-candidate-moves-container">
        <!-- 후보수 리스트 카드 -->
        <div class="flex flex-col border border-[var(--color-border-primary)]/80 bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden h-full">
          <div class="px-3 py-2 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-nested)] shrink-0">
            <h3 class="text-xs font-bold text-slate-300">합법 후보수 (Candidate Moves)</h3>
          </div>
          <div class="flex-1 min-h-0">
            <CandidateMoveList />
          </div>
        </div>
      </div>

      <!-- 모바일 기기에서의 상세 임베디드 탭패널 렌더링 -->
      <BottomPanel />
      
    </div>
  {/if}
</div>

<script lang="ts">
  import Board from '../board/Board.svelte';
  import BoardSettingsButton from '../board/BoardSettingsButton.svelte';
  import CandidateMoveList from '../moves/CandidateMoveList.svelte';
  import CandidateMovePanelTitle from '../moves/CandidateMovePanelTitle.svelte';
  import MoveHistoryStrip from '../moves/MoveHistoryStrip.svelte';
  import SidePanel from '../panels/SidePanel.svelte';
  import BottomPanel from '../panels/BottomPanel.svelte';

  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';

  const isDesktop = $derived(viewportStore.isDesktop);
  const isLowHeight = $derived(viewportStore.isLowHeightDesktop);
  const isCompact = $derived(viewportStore.isCompactDesktop);
  const isWideShortHeight = $derived(viewportStore.isWideShortHeight);
  const useCompactMode = $derived(isLowHeight || isCompact || isWideShortHeight);
  const useThreeColumnLayout = $derived(viewportStore.usesDesktopShell);
</script>

<div class="flex-1 {useCompactMode ? 'p-2 md:p-3' : 'p-3 md:p-5'} min-h-0 {viewportStore.layoutMode === 'extremeShortHeight' ? 'overflow-y-auto' : 'overflow-hidden'} flex flex-col" id="position-main-area">
  {#if useThreeColumnLayout}
    <!-- 통합 데스크톱 3열 셸 (CSS Grid 기반으로 데이터 레이아웃 제어) -->
    <div 
      id="desktop-3-column-layout" 
      class="flex-1 h-full max-h-full min-h-0 {viewportStore.layoutMode === 'extremeShortHeight' ? 'overflow-y-auto' : 'overflow-hidden'}"
      data-layout-mode={viewportStore.layoutMode === 'extremeShortHeight' ? 'extreme-short' : (isWideShortHeight ? 'wide-short' : (useCompactMode ? 'compact' : 'standard'))}
    >
      
      <!-- 1열: 체스 보드 -->
      <div 
        id="desktop-board-col" 
        class="grid min-h-0 bg-[var(--color-bg-panel)]/5 rounded-2xl border border-[var(--color-border-primary)]/40 overflow-hidden p-3 gap-2"
        style="grid-template-rows: auto minmax(0, 1fr) var(--move-history-strip-height);"
      >
        <div class="flex items-center justify-between shrink-0" id="board-toolbar-area">
          <span class="text-xs font-semibold text-slate-400 {isLowHeight ? 'scale-90 origin-left' : ''}">인터랙티브 연구 및 포지션 분석</span>
          <BoardSettingsButton />
        </div>
        <div class="flex items-center justify-center min-h-0 overflow-hidden">
          <Board />
        </div>
        <div id="desktop-history-slot">
          <MoveHistoryStrip />
        </div>
      </div>

      <!-- 2열: 합법 후보수 목록 -->
      <div 
        id="desktop-candidate-col"
        class="flex flex-col min-h-0 border border-[var(--color-border-primary)]/80 bg-[var(--color-bg-surface)] rounded-xl overflow-hidden"
      >
        <div class="px-3 py-2 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-nested)] shrink-0">
          <CandidateMovePanelTitle />
        </div>
        <div class="flex-1 min-h-0 flex flex-col">
          <CandidateMoveList />
        </div>
      </div>

      <!-- 3열: 정밀 분석 패널 탭 -->
      <div 
        class="flex flex-col min-h-0 overflow-hidden" 
        id="desktop-side-panel-col"
      >
        <SidePanel />
      </div>
      
    </div>
  {:else}
    <!-- 모바일/태블릿 단일 흐름 레이아웃 (Single Vertical Flow for Mobile & Tablet) -->
    <div class="flex-1 flex flex-col overflow-y-auto gap-4 scrollbar-thin select-none min-h-0 pb-20" id="mobile-single-flow-layout">
      
      <div class="flex items-center justify-between px-1 shrink-0" id="mobile-board-toolbar">
        <span class="text-xs font-bold text-slate-400">체스 기기 제어</span>
        <BoardSettingsButton />
      </div>

      <!-- 보드 영역 (정방형 자동 스케일링 유도) -->
      <div id="mobile-board-card" class="flex flex-col items-center justify-center p-3 bg-[var(--color-bg-panel)]/15 border border-[var(--color-border-primary)] rounded-2xl shrink-0">
        <Board />
      </div>

      <div id="mobile-history-slot">
        <MoveHistoryStrip />
      </div>

      <!-- 확장 수순 및 후보수 (모바일 단일 흐름 통합 뷰) -->
      <div class="shrink-0 min-h-[220px] max-h-[380px] h-[30vh]" id="mobile-candidate-moves-container">
        <!-- 후보수 리스트 카드 -->
        <div class="flex flex-col border border-[var(--color-border-primary)]/80 bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden h-full">
          <div class="px-3 py-2 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-nested)] shrink-0">
            <CandidateMovePanelTitle />
          </div>
          <div class="flex-1 min-h-0 flex flex-col">
            <CandidateMoveList />
          </div>
        </div>
      </div>

      <!-- 모바일 기기에서의 상세 임베디드 탭패널 렌더링 -->
      <BottomPanel />
      
    </div>
  {/if}
</div>

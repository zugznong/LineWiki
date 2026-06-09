<script lang="ts">
  import Board from '../board/Board.svelte';
  import BoardSettingsButton from '../board/BoardSettingsButton.svelte';
  import CandidateMoveList from '../moves/CandidateMoveList.svelte';
  import MoveHistoryStrip from '../moves/MoveHistoryStrip.svelte';
  import SidePanel from '../panels/SidePanel.svelte';
  import BottomPanel from '../panels/BottomPanel.svelte';

  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';

  const isDesktop = $derived(viewportStore.isDesktop);
</script>

<div class="flex-1 p-3 md:p-5 overflow-hidden flex flex-col min-h-0" id="position-main-area">
  {#if isDesktop}
    <!-- 데스크톱 3열 레이아웃 (Layout for Desktop >= 1024px) -->
    <div class="flex-1 flex flex-row gap-5 overflow-hidden min-h-0" id="desktop-3-column-layout">
      
      <!-- 1열: 체스 보드 (Column 1: Interactive Board) -->
      <div class="flex-1 flex flex-col gap-3 min-h-0 bg-slate-900/5 rounded-2xl border border-slate-900/40 p-4">
        <div class="flex items-center justify-between shrink-0 mb-1" id="board-toolbar-area">
          <span class="text-xs font-semibold text-slate-400">인터랙티브 연구 및 포지션 분석</span>
          <BoardSettingsButton />
        </div>
        <div class="flex-1 flex items-center justify-center min-h-0">
          <Board />
        </div>
        <MoveHistoryStrip />
      </div>

      <!-- 2열: 합법 후보수 목록 (Column 2: Candidate Moves) -->
      <div class="w-[320px] shrink-0 flex flex-col gap-4 min-h-0">
        <!-- 후보수 영역 -->
        <div class="flex-1 flex flex-col border border-slate-800 bg-slate-900/20 rounded-xl overflow-hidden min-h-0">
          <div class="px-4 py-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
            <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">주변 합법 후보수 (Candidate)</h3>
          </div>
          <div class="flex-1 overflow-y-auto">
            <CandidateMoveList />
          </div>
        </div>
      </div>

      <!-- 3열: 정밀 분석 패널 탭 (Column 3: Fine Analysis Panels) -->
      <div class="w-[385px] shrink-0 flex flex-col min-h-0" id="desktop-side-panel-col">
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
      <div class="flex flex-col items-center justify-center p-3 bg-slate-900/15 border border-slate-900 rounded-2xl shrink-0">
        <Board />
      </div>

      <MoveHistoryStrip />

      <!-- 모바일 설명 편의 구문 영역 -->
      <div class="flex items-center justify-start shrink-0 px-1 py-1">
        <span class="text-xs text-slate-400 font-medium">체스판 기물을 탭하여 새로운 라인을 전개하세요.</span>
      </div>

      <!-- 확장 수순 및 후보수 (모바일 단일 흐름 통합 뷰) -->
      <div class="shrink-0 min-h-[280px]">
        <!-- 후보수 리스트 카드 -->
        <div class="flex flex-col border border-slate-800/80 bg-slate-900/25 rounded-2xl overflow-hidden h-[260px]">
          <div class="px-4 py-3 border-b border-slate-800 bg-slate-950/30 shrink-0">
            <h3 class="text-xs font-bold text-slate-300">합법 후보수 (Candidate Moves)</h3>
          </div>
          <div class="flex-1 overflow-y-auto">
            <CandidateMoveList />
          </div>
        </div>
      </div>

      <!-- 모바일 기기에서의 상세 임베디드 탭패널 렌더링 -->
      <BottomPanel />
      
    </div>
  {/if}
</div>

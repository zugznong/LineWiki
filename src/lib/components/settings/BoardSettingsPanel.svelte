<script lang="ts">
  import BoardThemePreview from './BoardThemePreview.svelte';
  import PieceStylePreview from './PieceStylePreview.svelte';
  import ComingSoonSettingRow from './ComingSoonSettingRow.svelte';
  import { Eye, Settings2, Sparkles, BookOpen } from '@lucide/svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';

  const currentTheme = $derived(boardStore.themeName);
  const currentPieceStyle = $derived(boardStore.pieceStyle);
</script>

<div class="space-y-5" id="board-settings-panel">
  <!-- 현재 보드 메인 정보 및 활성 상태 -->
  <div class="bg-slate-900/10 border border-slate-900/60 rounded-xl p-4 space-y-3">
    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
      <Settings2 size={13} class="text-emerald-400" />
      <span>활성 그래픽 엔진 설정</span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <!-- Active Theme Info -->
      <div class="bg-slate-950/30 border border-slate-900 p-2.5 rounded-lg flex flex-col justify-center">
        <span class="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">주 테마</span>
        <span class="text-xs font-bold text-slate-200">{currentTheme}</span>
      </div>

      <!-- Active Piece Style Info -->
      <div class="bg-slate-950/30 border border-slate-900 p-2.5 rounded-lg flex flex-col justify-center">
        <span class="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">기물 그래픽</span>
        <span class="text-xs font-bold text-slate-200">{currentPieceStyle}</span>
      </div>
    </div>
  </div>

  <!-- 예쁘게 렌더링된 Classic Green 보드 컴포넌트 미리보기 -->
  <BoardThemePreview />

  <!-- 유니코드 백/흑 기물 샘플 표시 -->
  <PieceStylePreview />

  <!-- 향후 추가될 준비 중인 기능 목록 (Future pipeline) -->
  <div class="space-y-3 pt-2">
    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
      <BookOpen size={13} class="text-amber-500" />
      <span>향후 추가 기호 및 커스텀 로드맵</span>
    </div>

    <div class="space-y-2">
      <ComingSoonSettingRow 
        title="Custom Board Colors (나만의 색상)"
        description="자유로운 HEX 색상 코딩 입력을 통해 light/dark 타일 체스판 색을 나만의 취향대로 배합합니다."
      />
      <ComingSoonSettingRow 
        title="Piece Themes & Vector Asset (벡터 기물 팩)"
        description="전통 3D 스타일, 미니멀 네온 스킨, 상징 픽셀 벡터 그래픽 등 추가 전술용 패키지 세트를 로드합니다."
      />
      <ComingSoonSettingRow 
        title="Coordinates Style Custom (표기법 설정)"
        description="산출되는 외곽 배율 문자 크기, 글꼴, 그리고 체스 대수 좌표 표시의 회전 정렬 방향을 선택제어합니다."
      />
    </div>
  </div>
</div>

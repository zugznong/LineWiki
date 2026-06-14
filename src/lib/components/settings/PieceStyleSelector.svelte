<script lang="ts">
  import { Check } from '@lucide/svelte';
  import { PieceStyle } from '$lib/domain/board/PieceStyle';
  import { viewportStore } from '$lib/stores/viewportStore.svelte.ts';
  import { tick } from 'svelte';
  import BoardPiece from '../board/BoardPiece.svelte';
  import PieceStylePreview from './PieceStylePreview.svelte';

  interface Props {
    activeStyle: string;
    onSelect: (styleName: string) => void;
  }

  let { activeStyle, onSelect }: Props = $props();

  const pieceStyles = PieceStyle.getAllStyles();
  const isDesktop = $derived(viewportStore.isDesktop);

  let selectionContainer = $state<HTMLDivElement | null>(null);

  async function handleSelectionChange(styleName: string) {
    onSelect(styleName);
    await tick();

    if (selectionContainer) {
      const activeEl = selectionContainer.querySelector(
        `[data-style-name="${styleName}"]`
      );

      activeEl?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }

  function handleSelectElement(event: Event) {
    const target = event.target as HTMLSelectElement;
    handleSelectionChange(target.value);
  }
</script>

<div class="space-y-4">
  {#if !isDesktop}
    <!-- 모바일/태블릿: 네이티브 셀렉트 또는 최적화된 단일 콤보박스 사용 (활성 스타일 미리보기 1개만 노출) -->
    <div class="flex flex-col gap-2">
      <label for="piece-style-native-select" class="text-xs text-slate-400 font-semibold tracking-wide">
        기물 스타일 선택
      </label>
      <div class="relative w-full">
        <select
          id="piece-style-native-select"
          class="w-full bg-[var(--color-bg-nested)] border border-[var(--color-border-primary)] text-slate-100 text-xs font-bold rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/80 cursor-pointer appearance-none"
          value={activeStyle}
          onchange={handleSelectElement}
        >
          {#each pieceStyles as style (style.name)}
            <option value={style.name}>
              {style.name} ({style.kind === 'unicode' ? 'Unicode' : 'Vector SVG Pack'})
            </option>
          {/each}
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400 text-xs">
          ▼
        </div>
      </div>
    </div>

    <!-- 모바일/태블릿에서는 오직 활성화된 현재 한 팩의 풍부한 미리보기만 렌더링 (엄청난 404 성능 이득 및 경량화) -->
    <div class="pt-1">
      <PieceStylePreview pieceStyle={activeStyle} />
    </div>
  {:else}
    <!-- 데스크톱: 세련된 카드 목록형 레이아웃 -->
    <div 
      id="piece-style-selector-container"
      class="grid grid-cols-1 gap-1.5 scroll-smooth max-h-[300px] overflow-y-auto scrollbar-thin"
      bind:this={selectionContainer}
    >
      {#each pieceStyles as style (style.name)}
        {@const isSelected = activeStyle === style.name}
        <button
          type="button"
          data-style-name={style.name}
          class="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/80 {isSelected ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/5' : 'bg-[var(--color-bg-nested)] border-[var(--color-border-primary)]/60 hover:border-slate-500/50 hover:bg-slate-800/25'}"
          aria-pressed={isSelected}
          onclick={() => handleSelectionChange(style.name)}
        >
          <div class="flex items-center gap-3">
            <!-- 
              [중요] 비활성 행은 기물을 즉시 렌더링하지 않고, 
              오직 활성(선택됨) 행에만 BoardPiece 2개를 렌더링하여 404 prefetch 에러 폭주를 완벽하게 물리적 차단 
            -->
            {#if isSelected}
              <div class="flex items-center gap-1.5 border border-slate-950/20 bg-slate-900/40 px-1 py-0.5 rounded-md shrink-0 shadow-inner">
                <BoardPiece type="k" color="w" size={24} styleName={style.name} />
                <BoardPiece type="n" color="b" size={24} styleName={style.name} />
              </div>
            {:else}
              <!-- 비활성 행에 대한 우아하고 간결한 텍스트 또는 빈 자리 표시자 유지 -->
              <div class="w-[62px] h-[32px] flex items-center justify-center border border-dashed border-[var(--color-border-primary)]/50 bg-slate-900/10 rounded-md shrink-0 text-[10px] text-slate-500 select-none">
                Preview
              </div>
            {/if}

            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold {isSelected ? 'text-emerald-300' : 'text-slate-200'}">{style.name}</span>
                {#if style.name === 'Cburnett'}
                  <span class="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 px-1 py-[1px] rounded border border-emerald-500/30">기본</span>
                {/if}
              </div>
              <div class="flex flex-col gap-0.5">
                {#if style.kind === 'unicode'}
                  <span class="text-[10px] text-slate-500">호환 fallback (Unicode)</span>
                {:else}
                  <span class="text-[10px] text-slate-400">벡터 SVG 팩</span>
                {/if}
                <span class="text-[8.5px] text-slate-500 tracking-tight leading-3 font-mono">
                  License: {style.kind === 'svg' ? style.licenseId : 'Built-in Unicode'}
                </span>
              </div>
            </div>
          </div>
          {#if isSelected}
            <span class="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <Check size={9} /> Active
            </span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- 데스크톱에서도 현재 선택된 팩의 전체 미리보기 영역을 하단에 유연하게 배치하여 완성도 증진 -->
    <div class="pt-2">
      <PieceStylePreview pieceStyle={activeStyle} />
    </div>
  {/if}
</div>

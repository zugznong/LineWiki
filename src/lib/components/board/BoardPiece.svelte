<script lang="ts">
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import { PieceStyle } from '$lib/domain/board/PieceStyle';
  import { PieceAssetPath } from '$lib/domain/board/PieceAssetPath';
  
  let { type, color, size, styleName } = $props<{
    type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
    color: 'w' | 'b';
    size: number;
    styleName?: string;
  }>();

  // Map classic unicode piece fallback dynamically
  const piecesUnicodeMap: Record<string, Record<string, string>> = {
    p: { w: '♙', b: '♟' },
    r: { w: '♖', b: '♜' },
    n: { w: '♘', b: '♞' },
    b: { w: '♗', b: '♝' },
    q: { w: '♕', b: '♛' },
    k: { w: '♔', b: '♚' }
  };

  const code = $derived(piecesUnicodeMap[type]?.[color] || '');

  // failed CSS/SVG URL tracker to granularly fallback without affecting global configs or other piece variants
  let failedSvgSrc = $state<string>('');
  let hasRenderError = $state<boolean>(false);

  // 스타일 명칭이나 로드 대상 경로(svgSrc)가 변할 경우, 기존 에러 플래그들을 즉시 안전 초기화하여 Unicode fallback 루프 잔존을 차단합니다.
  $effect(() => {
    const _currentStyle = styleName || boardStore.pieceStyle;
    const _currentSrc = svgSrc;
    failedSvgSrc = '';
    hasRenderError = false;
  });

  const activeStyle = $derived(PieceStyle.getStyle(styleName || boardStore.pieceStyle));

  const svgSrc = $derived(
    activeStyle.kind === 'svg'
      ? PieceAssetPath.getPath(activeStyle.assetDirectory, color, type)
      : ''
  );

  const isFallback = $derived(activeStyle.kind === 'svg' && (failedSvgSrc === svgSrc || hasRenderError));
  const renderStyle = $derived(isFallback ? PieceStyle.CLASSIC : activeStyle);

  // 스타일 프리셋별 클래스 및 커스텀 스타일 연산
  const pieceClasses = $derived(
    "select-none leading-none text-center flex items-center justify-center transition-all duration-150 pointer-events-none scale-95"
  );

  const customStyle = $derived(
    renderStyle.kind === 'unicode'
      ? `font-size: ${size * renderStyle.scale}px; width: ${size}px; height: ${size}px; color: ${color === 'w' ? renderStyle.whiteColor : renderStyle.blackColor}; filter: ${color === 'w' ? renderStyle.whiteFilter : renderStyle.blackFilter}; pointer-events: none;`
      : `width: ${size}px; height: ${size}px; pointer-events: none;`
  );

  function handleImageError() {
    failedSvgSrc = svgSrc;
    hasRenderError = true;
  }
</script>

<div 
  class={pieceClasses}
  style={customStyle}
  aria-label="{color === 'w' ? 'White' : 'Black'} {type}"
  draggable="false"
>
  {#if renderStyle.kind === 'svg'}
    <img 
      src={svgSrc} 
      alt="{color === 'w' ? 'White' : 'Black'} {type}"
      style="width: {size * renderStyle.scale}px; height: {size * renderStyle.scale}px; object-fit: contain; pointer-events: none;"
      draggable="false"
      onerror={handleImageError}
    />
  {:else}
    <span draggable="false" style="pointer-events: none;">
      {code}
    </span>
  {/if}
</div>



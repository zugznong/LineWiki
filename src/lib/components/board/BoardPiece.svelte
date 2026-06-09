<script lang="ts">
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  
  let { type, color, size } = $props<{
    type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
    color: 'w' | 'b';
    size: number;
  }>();

  // Mapping unicode pieces cleanly
  // 백색/흑색 기물별 가장 칠해지고 가시성 높은 유니코드 체스 심볼 매핑
  const piecesUnicodeMap: Record<string, Record<string, string>> = {
    p: { w: '♙', b: '♟' },
    r: { w: '♖', b: '♜' },
    n: { w: '♘', b: '♞' },
    b: { w: '♗', b: '♝' },
    q: { w: '♕', b: '♛' },
    k: { w: '♔', b: '♚' }
  };

  const code = $derived(piecesUnicodeMap[type]?.[color] || '');

  // 스타일 프리셋별 클래스 및 커스텀 스타일 연산
  const pieceClasses = $derived(() => {
    const base = "select-none leading-none text-center flex items-center justify-center transition-all duration-150 pointer-events-none scale-95";
    
    // 일반 Unicode: 전통적 흰색 vs 검은색 기물 고대비 실크 스크린 섀도우
    if (color === 'w') {
      return `${base} text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]`;
    } else {
      return `${base} text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.25)] drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]`;
    }
  });
</script>

<div 
  class={pieceClasses()}
  style="font-size: {size * 0.76}px; width: {size}px; height: {size}px;"
  aria-label="{color === 'w' ? 'White' : 'Black'} {type}"
>
  <span>
    {code}
  </span>
</div>


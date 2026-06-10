<script lang="ts">
  import { onMount } from 'svelte';
  import BoardSquare from './BoardSquare.svelte';
  import BoardPiece from './BoardPiece.svelte';
  import BoardOverlay from './BoardOverlay.svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { calculateBoardSize } from '$lib/responsive/boardSize';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { DEFAULT_FEN } from '$lib/config/appConfig';

  let containerElement: HTMLDivElement | null = $state(null);
  let boardSize = $state(480);
  let squareSize = $state(60);

  // Parse ranks & files cleanly
  const files: ('a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h')[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  const currentPosition = $derived(positionStore.current);
  const selectedSquare = $derived(currentPosition?.selectedSquare || null);
  const legalDestinations = $derived(currentPosition?.legalDestinations || []);
  const activeColor = $derived(currentPosition?.activeColor || 'w');
  const piecesMap = $derived(currentPosition ? currentPosition.boardPieces : new Map());

  const orderedFiles = $derived(boardStore.orientation === 'black' ? [...files].reverse() : files);
  const orderedRanks = $derived(boardStore.orientation === 'black' ? [...ranks].reverse() : ranks);

  // ResizeObserver to track container sizes
  onMount(() => {
    if (!containerElement) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // fallback in case bounding height is zero
        const actualHeight = height || window.innerHeight - 200;
        const dims = calculateBoardSize(width, actualHeight);
        boardSize = dims.size;
        squareSize = dims.squareSize;
      }
    });

    observer.observe(containerElement);
    
    // Initial sizes calculations
    const bounds = containerElement.getBoundingClientRect();
    const initHeight = bounds.height || (window.innerHeight - 200);
    const dims = calculateBoardSize(bounds.width, initHeight);
    boardSize = dims.size;
    squareSize = dims.squareSize;

    return () => {
      observer.disconnect();
    };
  });

  // Material parser helper
  function getPieceAt(file: string, rank: number) {
    return piecesMap.get(`${file}${rank}`) || null;
  }

  function handleSquareClick(file: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h', rank: number) {
    if (!currentPosition) return;
    const sqStr = `${file}${rank}`;
    const services = createAppServices();

    if (selectedSquare === sqStr) {
      positionStore.updateSelectedSquare(null);
    } else if (legalDestinations.includes(sqStr)) {
      // Check if any of the candidate moves for this trajectory require promotion
      // Use client-side cached candidateMoves if available to avoid redundant calculation
      const cachedMoves = positionStore.candidateMoves;
      const matchingMoves = cachedMoves && cachedMoves.length > 0
        ? cachedMoves.filter(m => m.from === selectedSquare && m.to === sqStr)
        : services.generateCandidateMoves.execute(currentPosition.fen).moves.filter(m => m.from === selectedSquare && m.to === sqStr);

      const hasPromotion = matchingMoves.some(m => m.promotion);
      const promotionValue = hasPromotion ? 'q' : undefined;

      // Execute play move with conditional promotion values
      const playRes = services.playMove.execute(
        currentPosition.fen,
        selectedSquare!,
        sqStr,
        promotionValue
      );

      if (playRes.isOk()) {
        const moveResult = playRes.unwrap();
        services.navigateMove.execute(moveResult);
      }
      positionStore.updateSelectedSquare(null);
    } else {
      const piece = getPieceAt(file, rank);
      if (piece && piece.color === activeColor) {
        // Generate possible legal destinations using cache first to boost performance
        const cachedMoves = positionStore.candidateMoves;
        const cellMoves = cachedMoves && cachedMoves.length > 0
          ? cachedMoves.filter(m => m.from === sqStr)
          : services.generateCandidateMoves.execute(currentPosition.fen).filterByFromSquare(sqStr);
        
        const clickableDests = cellMoves.map(m => m.to);
        
        positionStore.updateSelectedSquare(sqStr, clickableDests);
      } else {
        positionStore.updateSelectedSquare(null);
      }
    }
  }

  function handleReset() {
    const services = createAppServices();
    services.navigation.goto('/');
  }
</script>

<div 
  class="w-full flex-1 flex items-center justify-center p-4 min-h-[300px] border border-[var(--color-border-primary)] bg-[var(--color-bg-nested)]/20 rounded-2xl relative"
  bind:this={containerElement}
  id="chess-board-wrapper"
>
  <div 
    class="relative rounded-[2px] shadow-2xl transition-all duration-300"
    style="width: {boardSize}px; height: {boardSize}px;"
    id="chess-grid"
  >
    <!-- Overlay boundaries -->
    {#if currentPosition?.isCheckmate || currentPosition?.isDraw}
      <BoardOverlay 
        isCheckmate={currentPosition.isCheckmate} 
        isDraw={currentPosition.isDraw} 
        activeColor={activeColor}
        onReset={handleReset}
      />
    {/if}

    <div 
      class="grid grid-cols-8 grid-rows-8 h-full w-full select-none"
    >
      {#each orderedRanks as rank}
        {#each orderedFiles as file}
          {@const piece = getPieceAt(file, rank)}
          {@const sqStr = `${file}${rank}`}
          {@const isLastMoveValue = positionStore.lastMove && (positionStore.lastMove.from === sqStr || positionStore.lastMove.to === sqStr)}
          
          <BoardSquare 
            {file} 
            {rank} 
            isSelected={selectedSquare === sqStr}
            isLastMove={!!isLastMoveValue}
            isHighlightDestination={legalDestinations.includes(sqStr)}
            onclick={() => handleSquareClick(file, rank)}
          >
            {#if piece}
              <BoardPiece 
                type={piece.type} 
                color={piece.color} 
                size={squareSize} 
              />
            {/if}
          </BoardSquare>
        {/each}
      {/each}
    </div>
  </div>
</div>

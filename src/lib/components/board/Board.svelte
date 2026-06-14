<script lang="ts">
  import { onMount } from 'svelte';
  import BoardSquare from './BoardSquare.svelte';
  import BoardPiece from './BoardPiece.svelte';
  import BoardOverlay from './BoardOverlay.svelte';
  import DraggedPieceOverlay from './DraggedPieceOverlay.svelte';
  import PromotionPicker from './PromotionPicker.svelte';
  import { boardStore } from '$lib/stores/boardStore.svelte.ts';
  import { promotionStore } from '$lib/stores/promotionStore.svelte.ts';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { calculateBoardSize } from '$lib/responsive/boardSize';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { DEFAULT_FEN } from '$lib/config/appConfig';
  import { localAnalysisStore } from '$lib/stores/localAnalysisStore.svelte.ts';
  import { navigating } from '$app/stores';

  let containerElement: HTMLDivElement | null = $state(null);
  let boardSize = $state(480);
  let squareSize = $state(60);
  let dragHoverSquare = $state<string | null>(null);

  // Helper function to check and trigger pawn promotion choice dialog
  function checkAndTriggerPromotion(from: string, to: string, source: 'click' | 'drag'): boolean {
    if (!currentPosition) return false;
    const services = createAppServices();
    const allowedPieces = services.getPromotionOptions.execute(currentPosition.fen, from, to);

    if (allowedPieces.length > 0) {
      promotionStore.openPromotionPicker({
        from,
        to,
        source,
        availablePromotions: allowedPieces
      });
      return true;
    }
    return false;
  }

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

    // 측정 대상은 카드 전체가 아니라 실제 보드가 들어갈 수 있는 내부 square container(containerElement)로 고정한다
    const measureTarget = containerElement;

    const getPadding = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const pt = parseFloat(style.paddingTop) || 0;
      const pb = parseFloat(style.paddingBottom) || 0;
      const pl = parseFloat(style.paddingLeft) || 0;
      const pr = parseFloat(style.paddingRight) || 0;
      return {
        horizontal: pl + pr,
        vertical: pt + pb
      };
    };

    const updateSizes = () => {
      if (!containerElement) return;
      const bounds = containerElement.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        const padding = getPadding(containerElement);
        // 패딩과 약간의 여유를 제외한 실제 보드가 들어갈 영역 계산
        const availWidth = Math.max(0, bounds.width - padding.horizontal - 16);
        const availHeight = Math.max(0, bounds.height - padding.vertical - 16);
        
        // containerElement.getBoundingClientRect()의 width/height 중 작은 값을 즉시 boardSize로 반영한다
        const limitSize = Math.min(availWidth, availHeight);
        let finalSize = Math.floor(limitSize / 8) * 8;
        
        if (finalSize < 240) finalSize = 240;
        if (finalSize > 800) finalSize = 800;
        
        boardSize = finalSize;
        squareSize = Math.floor(finalSize / 8);
      }
    };

    const observer = new ResizeObserver(() => {
      // requestAnimationFrame, debounce, transition 지연을 완전히 제거하여 지연 없는 즉각 반영을 구현한다
      updateSizes();
    });

    observer.observe(measureTarget);
    
    // Initial sizes calculation
    updateSizes();

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

      if (checkAndTriggerPromotion(selectedSquare!, sqStr, 'click')) {
        return;
      }

      // Execute play move
      const playRes = services.playMove.execute(
        currentPosition.fen,
        selectedSquare!,
        sqStr,
        undefined
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

  function handleGridKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      const targetEl = (e.target as HTMLElement)?.closest('[data-square]');
      const sq = targetEl?.getAttribute('data-square');
      if (sq) {
        e.preventDefault();
        const file = sq[0] as 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
        const rank = parseInt(sq[1], 10);
        handleSquareClick(file, rank);
      }
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // 방향키 이동은 현재 구현 범위 외이므로 이벤트를 소비하고 패스합니다.
      e.preventDefault();
    }
  }

  // Board coordinate conversion helper
  function getSquareFromCoords(clientX: number, clientY: number): string | null {
    const wrapperEl = document.getElementById('chess-board-wrapper');
    if (!wrapperEl) return null;
    const rect = wrapperEl.getBoundingClientRect();
    
    // Check boundaries
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Determine target col/row index from 0 to 7
    let colIndex = Math.floor((relativeX / rect.width) * 8);
    let rowIndex = Math.floor((relativeY / rect.height) * 8);
    
    colIndex = Math.max(0, Math.min(7, colIndex));
    rowIndex = Math.max(0, Math.min(7, rowIndex));
    
    // Map with orientation
    const finalFiles = boardStore.orientation === 'black' ? [...files].reverse() : files;
    const finalRanks = boardStore.orientation === 'black' ? [...ranks].reverse() : ranks;
    
    const targetFile = finalFiles[colIndex];
    const targetRank = finalRanks[rowIndex];
    
    return `${targetFile}${targetRank}`;
  }

  function handlePointerDown(e: PointerEvent) {
    // Only handle primary button clicks (usually 0) or touches
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // 1. 현재 포지션이 없음
    if (!currentPosition) return;

    // 2. 라우트 전환 중인 상태
    if ($navigating) return;

    const targetEl = (e.target as HTMLElement)?.closest('[data-square]');
    const sq = targetEl ? targetEl.getAttribute('data-square') : getSquareFromCoords(e.clientX, e.clientY);
    if (!sq) return;
    
    const file = sq[0] as 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
    const rank = parseInt(sq[1], 10);
    const piece = getPieceAt(file, rank);
    
    // Check if there is a piece on this square AND it is the current turn's color
    if (piece && piece.color === activeColor) {
      // Just set state as PRESSED, DO NOT preventDefault yet to allow scroll intent verification
      boardStore.beginPressDragCandidate(sq, piece.type, piece.color, e.pointerId, e.clientX, e.clientY, e.pointerType);
    } else {
      // 내 턴 기물이 아닌 칸일 경우 즉시 일반 클릭(선택/착지) 로직을 실행한다.
      handleSquareClick(file, rank);
    }
    dragHoverSquare = sq;
  }

  function handlePointerMove(e: PointerEvent) {
    const drag = boardStore.dragState;
    if (drag.type === 'idle') return;
    
    if (drag.pointerId !== e.pointerId) return;

    const currentSq = getSquareFromCoords(e.clientX, e.clientY);

    if (drag.type === 'pressed') {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // If judged as scroll intent (e.g. vertical displacement >= 6px and vertical motion dominates horizontal), cancel early
      if (drag.pointerType === 'touch' && absDy >= 6 && absDy > absDx * 1.25) {
        boardStore.cancelDrag();
        dragHoverSquare = null;
        return;
      }
      
      // Determine drag promotion threshold based on pointer type (Mouse: 3px, Touch: 7px)
      const threshold = drag.pointerType === 'mouse' ? 3 : 7;
      
      // Promote to dragging only when moving significantly
      if (dist >= threshold) {
        if (drag.piece === 'none') {
          // No piece to drag, don't promote, but we can track drag position
          boardStore.updateDragPosition(e.clientX, e.clientY);
          dragHoverSquare = currentSq;
          return;
        }

        // 승격 전 현재 포인터 좌표를 먼저 반영하여 overlay 미스매치 방지
        boardStore.updateDragPosition(e.clientX, e.clientY);

        boardStore.promoteToDragging();
        dragHoverSquare = currentSq;
        
        // Request pointer capture to lock the interaction to our grid ONLY AFTER actually promoting to dragging
        const gridEl = document.getElementById('chess-grid');
        if (gridEl) {
          try {
            gridEl.setPointerCapture(e.pointerId);
          } catch (err) {
            // silent catch
          }
        }
        
        // Once promoted to dragging, prevent standard browser moves
        if (e.cancelable) {
          e.preventDefault();
        }
        boardStore.updateDragPosition(e.clientX, e.clientY, 'drag');
      } else {
        // Just track position within threshold (do NOT call preventDefault here!)
        boardStore.updateDragPosition(e.clientX, e.clientY);
        dragHoverSquare = currentSq;
      }
    } else if (drag.type === 'dragging') {
      if (e.cancelable) {
        e.preventDefault();
      }
      boardStore.updateDragPosition(e.clientX, e.clientY, 'drag');
      dragHoverSquare = currentSq;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    const drag = boardStore.dragState;
    if (drag.type === 'idle') return;
    if (drag.pointerId !== e.pointerId) return;

    const targetEl = (e.target as HTMLElement)?.closest('[data-square]');
    const targetSq = targetEl ? targetEl.getAttribute('data-square') : getSquareFromCoords(e.clientX, e.clientY);
    const services = createAppServices();

    if (drag.type === 'dragging') {
      const fromSq = drag.fromSquare;
      let moveExecuted = false;
      
      // Before moving, check if targetSquare is valid and is a legal destination
      const piece = getPieceAt(fromSq[0], parseInt(fromSq[1], 10));
      if (piece && piece.color === activeColor && targetSq && targetSq !== fromSq) {
        // Calculate matching moves for fromSq -> targetSq
        const cachedMoves = positionStore.candidateMoves || [];
        const matchingMoves = cachedMoves.length > 0
          ? cachedMoves.filter(m => m.from === fromSq && m.to === targetSq)
          : services.generateCandidateMoves.execute(currentPosition!.fen).moves.filter(m => m.from === fromSq && m.to === targetSq);

        if (matchingMoves.length > 0) {
          if (checkAndTriggerPromotion(fromSq, targetSq!, 'drag')) {
            const gridEl = document.getElementById('chess-grid');
            if (gridEl) {
              try {
                gridEl.releasePointerCapture(e.pointerId);
              } catch (_) {}
            }
            dragHoverSquare = null;
            return;
          }

          const playRes = services.playMove.execute(
            currentPosition!.fen,
            fromSq,
            targetSq,
            undefined
          );

          if (playRes.isOk()) {
            const moveResult = playRes.unwrap();
            services.navigateMove.execute(moveResult);
            moveExecuted = true;
          }
        }
      }
      
      if (moveExecuted) {
        boardStore.endDrag();
      } else {
        // 드롭 대상이 원본 칸이거나 합법 목적지가 아니면 이동하지 않고 cancelDrag()를 명시적으로 호출
        boardStore.cancelDrag();
      }
      
      // Clear selection upon drag completion/resolution (fixed policy: always clear on drag release)
      positionStore.updateSelectedSquare(null);
      
      // Release pointer capture
      const gridEl = document.getElementById('chess-grid');
      if (gridEl) {
        try {
          gridEl.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    } else if (drag.type === 'pressed') {
      // Static tap/click sequence
      const fromSq = drag.fromSquare;
      const file = fromSq[0] as 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
      const rank = parseInt(fromSq[1], 10);
      handleSquareClick(file, rank);
      
      boardStore.endDrag();
    }
    dragHoverSquare = null;
  }

  function handlePointerCancel(e: PointerEvent) {
    const drag = boardStore.dragState;
    if (drag.type !== 'idle' && drag.pointerId === e.pointerId) {
      boardStore.cancelDrag();
      const gridEl = document.getElementById('chess-grid');
      if (gridEl) {
        try {
          gridEl.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
    dragHoverSquare = null;
  }
  
  function handleLostPointerCapture(e: PointerEvent) {
    const drag = boardStore.dragState;
    if (drag.type !== 'idle' && drag.pointerId === e.pointerId) {
      boardStore.cancelDrag();
    }
    dragHoverSquare = null;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const drag = boardStore.dragState;
      if (drag.type !== 'idle') {
        boardStore.cancelDrag();
        const gridEl = document.getElementById('chess-grid');
        if (gridEl) {
          try {
            gridEl.releasePointerCapture(drag.pointerId);
          } catch (_) {}
        }
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div 
  class="w-full flex-1 flex items-center justify-center p-4 min-h-[300px] border border-[var(--color-border-primary)] bg-[var(--color-bg-nested)]/20 rounded-2xl relative"
  bind:this={containerElement}
  id="chess-board-card"
>
  <div 
    class="relative rounded-[2px] shadow-2xl"
    style="width: {boardSize}px; height: {boardSize}px; min-width: {boardSize}px; min-height: {boardSize}px; max-width: {boardSize}px; max-height: {boardSize}px;"
    id="chess-board-wrapper"
  >
    <DraggedPieceOverlay {squareSize} />
    <PromotionPicker />

    <!-- Overlay boundaries -->
    {#if currentPosition?.isCheckmate || currentPosition?.isDraw || boardStore.dragState.type === 'dragging'}
      <BoardOverlay 
        isCheckmate={!!currentPosition?.isCheckmate} 
        isDraw={!!currentPosition?.isDraw} 
        activeColor={activeColor}
        onReset={handleReset}
        {orderedFiles}
        {orderedRanks}
        {legalDestinations}
        {dragHoverSquare}
      />
    {/if}

    <div 
      class="grid grid-cols-8 grid-rows-8 h-full w-full select-none"
      class:dragging-board={boardStore.dragState.type === 'dragging'}
      id="chess-grid"
      role="grid"
      tabindex="0"
      aria-label="체스보드"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerCancel}
      onlostpointercapture={handleLostPointerCapture}
      onkeydown={handleGridKeyDown}
    >
      {#each orderedRanks as rank}
        {#each orderedFiles as file}
          {@const piece = getPieceAt(file, rank)}
          {@const sqStr = `${file}${rank}`}
          {@const isLastMoveValue = positionStore.lastMove && (positionStore.lastMove.from === sqStr || positionStore.lastMove.to === sqStr)}
          {@const isCaptureDestination = legalDestinations.includes(sqStr) && !!piece}
          
          <BoardSquare 
            {file} 
            {rank} 
            isSelected={selectedSquare === sqStr}
            isLastMove={!!isLastMoveValue}
            isHighlightDestination={legalDestinations.includes(sqStr)}
            {isCaptureDestination}
            hasPiece={!!piece}
            pieceType={piece?.type}
            pieceColor={piece?.color}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSquareClick(file, rank);
              }
            }}
          >
            {#if piece}
              {@const isDraggingThis = boardStore.dragState.type === 'dragging' && boardStore.dragState.fromSquare === sqStr}
              <div class={isDraggingThis ? 'drag-source-piece transition-opacity duration-150' : 'transition-opacity duration-150'}>
                <BoardPiece 
                  type={piece.type} 
                  color={piece.color} 
                  size={squareSize} 
                />
              </div>
            {/if}
          </BoardSquare>
        {/each}
      {/each}
    </div>
  </div>
</div>

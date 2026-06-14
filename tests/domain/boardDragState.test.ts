import { describe, test, expect, beforeEach } from 'vitest';
import { boardStore } from '../../src/lib/stores/boardStore.svelte';

describe('Board Drag State Transitions Tests', () => {
  beforeEach(() => {
    boardStore.init({ theme: 'Classic Green', pieceStyle: 'Unicode', orientation: 'white', showCoordinates: true });
  });

  test('idle -> pressed -> dragging -> idle 상태 전이 및 좌표/기물/스퀘어 유지 검증', () => {
    // 1. 초기 상태: idle
    expect(boardStore.dragState.type).toBe('idle');

    // 2. idle -> pressed
    boardStore.beginPressDragCandidate('e2', 'P', 'w', 1, 100, 200, 'mouse');
    expect(boardStore.dragState.type).toBe('pressed');
    
    const pressedState = boardStore.dragState as any;
    expect(pressedState.fromSquare).toBe('e2');
    expect(pressedState.piece).toBe('P');
    expect(pressedState.pieceColor).toBe('w');
    expect(pressedState.pointerId).toBe(1);
    expect(pressedState.pointerType).toBe('mouse');
    expect(pressedState.startClientX).toBe(100);
    expect(pressedState.startClientY).toBe(200);
    expect(pressedState.currentClientX).toBe(100);
    expect(pressedState.currentClientY).toBe(200);
    expect(pressedState.dragIntent).toBe('unknown');

    // 3. updateDragPosition (pressed 상태에서 단순 이동)
    boardStore.updateDragPosition(105, 205);
    const updatedPressed = boardStore.dragState as any;
    expect(updatedPressed.type).toBe('pressed');
    expect(updatedPressed.fromSquare).toBe('e2');
    expect(updatedPressed.currentClientX).toBe(105);
    expect(updatedPressed.currentClientY).toBe(205);

    // 4. pressed -> dragging (promoteToDragging)
    boardStore.promoteToDragging();
    expect(boardStore.dragState.type).toBe('dragging');
    
    const draggingState = boardStore.dragState as any;
    expect(draggingState.fromSquare).toBe('e2');
    expect(draggingState.piece).toBe('P');
    expect(draggingState.pieceColor).toBe('w');
    expect(draggingState.pointerId).toBe(1);
    expect(draggingState.pointerType).toBe('mouse');
    expect(draggingState.startClientX).toBe(100);
    expect(draggingState.startClientY).toBe(200);
    expect(draggingState.currentClientX).toBe(105);
    expect(draggingState.currentClientY).toBe(205);
    expect(draggingState.dragIntent).toBe('drag');

    // 5. dragging 상태에서의 이동
    boardStore.updateDragPosition(150, 250);
    const updatedDragging = boardStore.dragState as any;
    expect(updatedDragging.type).toBe('dragging');
    expect(updatedDragging.currentClientX).toBe(150);
    expect(updatedDragging.currentClientY).toBe(250);

    // 6. dragging -> idle (endDrag)
    boardStore.endDrag();
    expect(boardStore.dragState.type).toBe('idle');
  });

  test('pressed -> cancel 상태 전이 검증', () => {
    boardStore.beginPressDragCandidate('e2', 'P', 'w', 1, 100, 200, 'mouse');
    expect(boardStore.dragState.type).toBe('pressed');

    boardStore.cancelDrag();
    expect(boardStore.dragState.type).toBe('idle');
  });

  test('dragging -> cancel 상태 전이 검증', () => {
    boardStore.beginPressDragCandidate('e2', 'P', 'w', 1, 100, 200, 'mouse');
    boardStore.promoteToDragging();
    expect(boardStore.dragState.type).toBe('dragging');

    boardStore.cancelDrag();
    expect(boardStore.dragState.type).toBe('idle');
  });
});

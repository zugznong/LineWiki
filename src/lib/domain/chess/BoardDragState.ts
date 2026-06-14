export interface DragStateIdle {
  type: 'idle';
}

export interface DragStatePressed {
  type: 'pressed';
  fromSquare: string;
  piece: string; // The standard chess piece representation, eg. "p", "R", etc.
  pieceColor: 'w' | 'b';
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch' | string;
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  dragIntent: 'unknown' | 'scroll' | 'drag';
}

export interface DragStateDragging {
  type: 'dragging';
  fromSquare: string;
  piece: string;
  pieceColor: 'w' | 'b';
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch' | string;
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  dragIntent: 'drag';
}

export type BoardDragState = DragStateIdle | DragStatePressed | DragStateDragging;

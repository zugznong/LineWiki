export interface MoveIntent {
  from: string;
  to: string;
  source: 'click' | 'drag' | 'candidate';
  promotion?: string;
}

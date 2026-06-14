export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface PromotionRequest {
  from: string;
  to: string;
  source: 'click' | 'drag';
  availablePromotions: PromotionPiece[];
  clientX?: number;
  clientY?: number;
}

import { createAppServices } from '../composition/createAppServices';
import type { PromotionPiece, PromotionRequest } from '../domain/chess/PromotionChoice';
import { positionStore } from './positionStore.svelte.ts';
import { boardStore } from './boardStore.svelte.ts';

class PromotionStore {
  private state = $state<{
    pendingPromotion: PromotionRequest | null;
  }>({
    pendingPromotion: null
  });

  public get pendingPromotion(): PromotionRequest | null {
    return this.state.pendingPromotion;
  }

  public openPromotionPicker(request: PromotionRequest) {
    this.state.pendingPromotion = request;
  }

  public choosePromotion(piece: PromotionPiece) {
    if (!this.state.pendingPromotion) return;
    const { from, to, source } = this.state.pendingPromotion;

    const services = createAppServices();
    const currentPosition = positionStore.current;
    if (currentPosition) {
      const playRes = services.playMove.execute(
        currentPosition.fen,
        from,
        to,
        piece
      );

      if (playRes.isOk()) {
        const moveResult = playRes.unwrap();
        services.navigateMove.execute(moveResult);
      }
    }

    // Clean up
    this.state.pendingPromotion = null;
    positionStore.updateSelectedSquare(null);
    if (source === 'drag') {
      boardStore.endDrag();
    }
  }

  public cancelPromotion() {
    if (!this.state.pendingPromotion) return;
    const { source } = this.state.pendingPromotion;

    this.state.pendingPromotion = null;
    positionStore.updateSelectedSquare(null);
    if (source === 'drag') {
      boardStore.cancelDrag();
    }
  }
}

export const promotionStore = new PromotionStore();

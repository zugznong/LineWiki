import { describe, it, expect } from 'vitest';
import { parseMoveAnnotation, getMoveAnnotationCount } from '../../src/lib/domain/chess/MoveAnnotation';

describe('MoveAnnotation Domain Tests', () => {
  it('should parse exd8=Q+ as check, capture, and promotion concurrently', () => {
    const ann = parseMoveAnnotation('exd8=Q+');
    expect(ann.isCheck).toBe(true);
    expect(ann.isCapture).toBe(true);
    expect(ann.isPromotion).toBe(true);
    expect(ann.isMate).toBe(false);
    expect(ann.promotionPiece).toBe('q');
    
    // Check annotation count: capture(1) + promotion(1) + check/mate(1) = 3
    expect(getMoveAnnotationCount(ann)).toBe(3);
  });

  it('should parse Qxf7# as check, mate, and capture concurrently', () => {
    const ann = parseMoveAnnotation('Qxf7#');
    expect(ann.isCheck).toBe(true);
    expect(ann.isMate).toBe(true);
    expect(ann.isCapture).toBe(true);
    expect(ann.isPromotion).toBe(false);
    expect(ann.promotionPiece).toBeNull();
    
    // Check annotation count: capture(1) + check/mate(1) = 2
    expect(getMoveAnnotationCount(ann)).toBe(2);
  });

  it('should parse axb8=N+ as check, capture, and promotion with knight', () => {
    const ann = parseMoveAnnotation('axb8=N+');
    expect(ann.isCheck).toBe(true);
    expect(ann.isCapture).toBe(true);
    expect(ann.isPromotion).toBe(true);
    expect(ann.isMate).toBe(false);
    expect(ann.promotionPiece).toBe('n');
    
    // Check annotation count: capture(1) + promotion(1) + check/mate(1) = 3
    expect(getMoveAnnotationCount(ann)).toBe(3);
  });

  it('should handle standard move e4 with no extra attributes', () => {
    const ann = parseMoveAnnotation('e4');
    expect(ann.isCheck).toBe(false);
    expect(ann.isCapture).toBe(false);
    expect(ann.isPromotion).toBe(false);
    expect(ann.isMate).toBe(false);
    expect(ann.promotionPiece).toBeNull();
    
    // Check annotation count: 0
    expect(getMoveAnnotationCount(ann)).toBe(0);
  });
});

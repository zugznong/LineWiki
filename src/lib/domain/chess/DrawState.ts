export type DrawState =
  | 'none'
  | 'stalemate'
  | 'insufficient-material'
  | 'fifty-move'
  | 'threefold-repetition'
  | 'seventyfive-move';

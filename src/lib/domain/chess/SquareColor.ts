/**
 * Calculates whether a chess square is a light square or a dark square.
 * According to standard chess rules, the bottom-right square 'h1' must be a light square,
 * and the bottom-left square 'a1' must be a dark square.
 *
 * @param file 'a' through 'h'
 * @param rank 1 through 8
 */
export function isLightSquare(file: string, rank: number): boolean {
  return ((file.charCodeAt(0) - 97) + rank) % 2 === 0;
}

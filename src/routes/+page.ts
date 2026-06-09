import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/examples/positions.json');
    if (res.ok) {
      const examples = await res.json();
      return { examples };
    }
  } catch (err) {
    console.error('Failed to load example positions:', err);
  }

  // Backup fallback initial examples in case of fetch errors
  return {
    examples: [
      {
        name: "Starting Position (기본 시작 포지션)",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      },
      {
        name: "Ruy Lopez (루이 로페즈 오프닝)",
        fen: "r1bqk2r/1ppp1ppp/2n2n2/1b2p3/4P3/5N2/PPPPBPPP/RNBQ1RK1 w kq - 0 6"
      }
    ]
  };
};

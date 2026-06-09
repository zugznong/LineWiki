import type { PageLoad } from './$types';
import { createChessServices } from '$lib/composition/createChessServices';

export const load: PageLoad = async ({ params }) => {
  const rawFen = params.fen || '';
  
  if (!rawFen) {
    return {
      fen: '',
      isValid: false,
      error: '검증할 FEN 코드가 입력되지 않았습니다.'
    };
  }

  const services = createChessServices();
  const result = services.restoreFenFromUrl.execute(rawFen);

  if (result.isFailure()) {
    return {
      fen: '',
      isValid: false,
      error: result.unwrapErr().message
    };
  }

  const fen = result.unwrap();

  return {
    fen,
    isValid: true,
    error: null
  };
};

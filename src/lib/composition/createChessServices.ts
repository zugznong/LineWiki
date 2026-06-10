import { ChessJsEngineAdapter } from '../adapters/chess/ChessJsEngineAdapter';
import { CreatePositionFromFenUseCase } from '../application/chess/CreatePositionFromFenUseCase';
import { CreateFenUrlUseCase } from '../application/chess/CreateFenUrlUseCase';
import { GenerateCandidateMovesUseCase } from '../application/chess/GenerateCandidateMovesUseCase';
import { PlayMoveUseCase } from '../application/chess/PlayMoveUseCase';
import { RestoreFenFromUrlUseCase } from '../application/chess/RestoreFenFromUrlUseCase';

// Singletons to prevent reinstantiating inside component updates
const chessEngine = new ChessJsEngineAdapter();
const createPosition = new CreatePositionFromFenUseCase(chessEngine);
const createFenUrl = new CreateFenUrlUseCase(chessEngine);
const generateCandidateMoves = new GenerateCandidateMovesUseCase(chessEngine);
const playMove = new PlayMoveUseCase(chessEngine);
const restoreFenFromUrl = new RestoreFenFromUrlUseCase(chessEngine);

export function createChessServices() {
  return {
    chessEngine,
    createPosition,
    createFenUrl,
    generateCandidateMoves,
    playMove,
    restoreFenFromUrl
  };
}

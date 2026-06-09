import { createChessServices } from './createChessServices';
import { createAnalysisServices } from './createAnalysisServices';
import { createStorageServices } from './createStorageServices';
import { createDisabledCommunityServices } from './createDisabledCommunityServices';
import { SvelteNavigationAdapter } from '../adapters/navigation/SvelteNavigationAdapter';
import { NavigateMoveUseCase } from '../application/chess/NavigateMoveUseCase';

export type AppServices = ReturnType<typeof buildCommonServices>;

let cachedChessServices: ReturnType<typeof createChessServices> | null = null;
let cachedStorageServices: ReturnType<typeof createStorageServices> | null = null;
let cachedAnalysisServices: ReturnType<typeof createAnalysisServices> | null = null;
let cachedNavigationAdapter: SvelteNavigationAdapter | null = null;
let cachedNavigateMove: NavigateMoveUseCase | null = null;
let cachedAppServices: AppServices | null = null;

export function getChessServices() {
  if (!cachedChessServices) {
    cachedChessServices = createChessServices();
  }
  return cachedChessServices;
}

export function getStorageServices() {
  if (!cachedStorageServices) {
    cachedStorageServices = createStorageServices();
  }
  return cachedStorageServices;
}

export function getNavigationAdapter() {
  if (!cachedNavigationAdapter) {
    cachedNavigationAdapter = new SvelteNavigationAdapter();
  }
  return cachedNavigationAdapter;
}

export function getNavigateMove() {
  if (!cachedNavigateMove) {
    const navigation = getNavigationAdapter();
    const storage = getStorageServices();
    cachedNavigateMove = new NavigateMoveUseCase(navigation, storage.pushLineHistory);
  }
  return cachedNavigateMove;
}

export function getAnalysisServices() {
  if (!cachedAnalysisServices) {
    const chess = getChessServices();
    cachedAnalysisServices = createAnalysisServices(chess.chessEngine);
  }
  return cachedAnalysisServices;
}

function buildCommonServices() {
  const chess = getChessServices();
  const analysis = getAnalysisServices();
  const storage = getStorageServices();
  const community = createDisabledCommunityServices();
  const navigation = getNavigationAdapter();
  const navigateMove = getNavigateMove();

  return {
    ...chess,
    ...analysis,
    ...storage,
    ...community,
    navigation,
    navigateMove
  };
}

export function createAppServices(): AppServices {
  if (!cachedAppServices) {
    cachedAppServices = buildCommonServices();
  }
  return cachedAppServices;
}

export function getAppServices(): AppServices {
  return createAppServices();
}


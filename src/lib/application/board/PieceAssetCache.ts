import { isBrowser } from '$lib/config/runtimeConfig';
import { PieceAssetPath } from '$lib/domain/board/PieceAssetPath';
import { PieceStyle } from '$lib/domain/board/PieceStyle';

export class PieceAssetCache {
  private static cache = new Map<string, Promise<void>>();

  /**
   * 개별 기물 URL을 이미지 객체로 변환하여 preload / decode 처리를 수행합니다.
   * 동일한 URL에 대해서는 중복 호출되더라도 단 한 번만 로드되도록 프로미스를 공유합니다.
   */
  public static preloadUrl(url: string): Promise<void> {
    if (!isBrowser) {
      return Promise.resolve();
    }

    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = url;

      const handleLoad = () => {
        if ('decode' in img && typeof img.decode === 'function') {
          img.decode()
            .then(() => resolve())
            .catch(() => {
              // decode 자체는 실패할 수 있어도 로딩 성공으로 간주하여 복조 회복
              resolve();
            });
        } else {
          resolve();
        }
      };

      const handleError = () => {
        reject(new Error(`Failed to load SVG piece asset from: ${url}`));
      };

      if (img.complete) {
        handleLoad();
      } else {
        img.onload = handleLoad;
        img.onerror = handleError;
      }
    });

    this.cache.set(url, promise);
    return promise;
  }

  /**
   * 선택한 스타일의 12개 기물 URL(2색상 * 6종류)에 대해 preload 과정을 기동합니다.
   */
  public static preloadStyle(styleName: string): Promise<void[]> {
    const style = PieceStyle.getStyle(styleName);
    if (style.kind !== 'svg') {
      return Promise.resolve([]);
    }

    const types = ['p', 'r', 'n', 'b', 'q', 'k'] as const;
    const colors = ['w', 'b'] as const;
    const promises: Promise<void>[] = [];

    for (const color of colors) {
      for (const type of types) {
        try {
          const url = PieceAssetPath.getPath(style.assetDirectory, color, type);
          promises.push(this.preloadUrl(url));
        } catch (err) {
          // 보안 규칙 위반 등의 패스 발생 시 안정적인 skip 보장
        }
      }
    }

    return Promise.all(promises);
  }

  /**
   * 현재 캐시에 URL이 적재되어 존재하는지 여부
   */
  public static has(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * 캐시된 Promise를 획득합니다.
   */
  public static get(url: string): Promise<void> | undefined {
    return this.cache.get(url);
  }

  /**
   * 보관 중인 전체 로컬 캐시를 클리어합니다 (테스트용 등)
   */
  public static clear(): void {
    this.cache.clear();
  }
}

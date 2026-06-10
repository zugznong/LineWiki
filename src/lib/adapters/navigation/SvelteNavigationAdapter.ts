import { goto } from '$app/navigation';
import { isBrowser } from '../../config/runtimeConfig';
import { isSafeInternalPath } from '../../utils/url';

/**
 * SvelteKit의 내장 라우팅 네비게이션 기능과 브라우저 히스토리 조작 제어를 캡슐화한 어댑터입니다.
 * SSR(Server-Side Rendering) 환경에서 클라이언트 사이드 고유 객체인 window 또는 
 * SvelteKit 전용 navigator가 잘못 평가되어 에러가 발생하는 현상을 사전에 완벽히 방어합니다.
 */
export class SvelteNavigationAdapter {
  /**
   * 지정된 프로젝트 내부 경로로만 클라이언트 라우트를 안전하게 갱신 이동시킵니다.
   *
   * 오픈 리다이렉트 및 위험 스킴(javascript:/data:) 차단을 위해 내부 절대경로(/로 시작)만 허용하며,
   * 그 외 입력은 조용히 무시됩니다. 로그에는 (잠재적으로 신뢰할 수 없는) 원본 경로를 남기지 않습니다.
   */
  public goto(path: string): void {
    if (!isBrowser) {
      return;
    }
    if (!isSafeInternalPath(path)) {
      console.warn('[네비게이션 차단] 허용되지 않은 비내부 경로 이동 요청이 차단되었습니다.');
      return;
    }
    try {
      goto(path);
    } catch (err) {
      console.error('[네비게이션 오류] 내부 경로 이동 중 상호작용 오류가 감지되었습니다:', err);
    }
  }

  /**
   * 브라우저의 Window History API 스택을 활용하여 사용자를 이전 탐색 세션 국면으로 되돌립니다.
   */
  public back(): void {
    if (isBrowser && typeof window !== 'undefined' && window.history) {
      try {
        window.history.back();
      } catch (err) {
        console.error('[히스토리 백 오류] 이전 페이지로 뒤로가기 실행 중 예외가 발생했습니다:', err);
      }
    } else {
      console.warn('[히스토리 백 경고] 서버 환경이거나 History 객체 접근불가 상태이므로 뒤로가기 액션을 중단합니다.');
    }
  }

  /**
   * 브라우저 세션 내에 되돌아갈 수 있는 히스토리 기록이 존재하여 뒤로가기가 성립 가능한지 여부를 조회합니다.
   */
  public canGoBack(): boolean {
    if (isBrowser && typeof window !== 'undefined' && window.history) {
      return window.history.length > 1;
    }
    return false;
  }
}


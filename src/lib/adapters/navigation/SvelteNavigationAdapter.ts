import { goto } from '$app/navigation';
import { isBrowser } from '../../config/runtimeConfig';
import { isSafeInternalPath } from '../../utils/url';

/**
 * SvelteKit의 내장 라우팅 네비게이션 기능과 브라우저 히스토리 조작 제어를 캡슐화한 어댑터입니다.
 * SSR(Server-Side Rendering) 환경에서 클라이언트 사이드 고유 객체인 window 또는 
 * SvelteKit 전용 navigator가 잘못 평가되어 에러가 발생하는 현상을 사전에 완벽히 방어합니다.
 */
export class SvelteNavigationAdapter {
  constructor() {
    // 단순 명령 전달형 어댑터이므로 별도의 자체 이력 상태나 popstate 가로채기 이벤트를 유지하지 않습니다.
  }

  /**
   * 지정된 프로젝트 내부 경로로 클라이언트 라우트를 안전하게 갱신 이동시킵니다.
   *
   * 오픈 리다이렉트 및 위험 스킴(javascript:/data:) 차단을 위해 내부 절대경로(/로 시작)만 허용합니다.
   * FEN이 포함된 경로가 로그에 남지 않도록 실패 로그에는 원본 path를 출력하지 않습니다.
   */
  public goto(path: string): { success: boolean; error?: string } {
    let normalized = path.trim();
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    normalized = normalized.replace(/\/+/g, '/');

    if (!isSafeInternalPath(normalized)) {
      console.error('[네비게이션 보안 가드] 허용되지 않는 경로 패턴이 감지되었습니다.');
      return { success: false, error: '보안 정책에 위배되는 경로입니다.' };
    }

    if (isBrowser && typeof window !== 'undefined' && window.location) {
      if (window.location.pathname === normalized) {
        return { success: true };
      }

      try {
        goto(normalized).catch(err => {
          // FEN이 포함된 경로는 로그에 제외하고 안전한 유형만 기록
          console.error('[네비게이션 오류] SvelteKit goto 이동 호출 실패. 경로 유형: [FEN_ROUTE_PATH]', err);
        });
        return { success: true };
      } catch (err) {
        console.error('[네비게이션 오류] 동기적 컴포넌트 마운트 라우팅 예외 감지. 경로 유형: [FEN_ROUTE_PATH]', err);
        return { success: false, error: '라우팅 이동 도중 예상하지 못한 상호작용 오류가 발생했습니다.' };
      }
    } else {
      console.warn('[네비게이션 경고] 서버 사이드 구동 단계이므로 클라이언트 전용 네비게이션을 스킵합니다.');
      return { success: true };
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
   * 브라우저의 Window History API 스택을 활용하여 사용자를 다음 탐색 세션 국면으로 보냅니다.
   */
  public forward(): void {
    if (isBrowser && typeof window !== 'undefined' && window.history) {
      try {
        window.history.forward();
      } catch (err) {
        console.error('[히스토리 포워드 오류] 다음 페이지로 앞으로가기 실행 중 예외가 발생했습니다:', err);
      }
    } else {
      console.warn('[히스토리 포워드 경고] 서버 환경이거나 History 객체 접근불가 상태이므로 앞으로가기 액션을 중단합니다.');
    }
  }
}



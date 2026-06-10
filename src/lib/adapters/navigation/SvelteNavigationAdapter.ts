import { goto } from '$app/navigation';
import { isBrowser } from '../../config/runtimeConfig';

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
   * 지정된 프로젝트 내부 경로 또는 외부 URL로 클라이언트 라우트를 안전하게 갱신 이동시킵니다.
   */
  public goto(path: string): void {
    if (!path) return;

    // 보안 검증 가드: 오직 내부 경로( '/'로 시작)만 수용하며, 하이퍼링크 리디렉션 스키마 및 인젝션 코드 차단
    if (!path.startsWith('/') || /^(https?:|ftp:|javascript:|file:|data:|\/\/)/i.test(path) || /[<>]/.test(path)) {
      console.error(`[네비게이션 보안 가드] 허용되지 않는 이상 경로 및 위험 문자 패턴이 감지되어 이동을 거부합니다: ${path}`);
      return;
    }

    if (isBrowser) {
      try {
        goto(path).catch(err => {
          console.error(`[네비게이션 오류] 이동 수행 실패:`, err);
        });
      } catch (err) {
        console.error(`[네비게이션 오류] '${path}' 경로로 이동 중 상호작용 오류가 감지되었습니다:`, err);
      }
    } else {
      console.warn(`[네비게이션 경고] 서버 사이드 렌더링(SSR) 구동 단계이므로 '${path}' 이동 요청을 누락 방지 처리합니다.`);
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



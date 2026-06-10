# 배포 가이드 — Cloudflare Pages

LineWiki를 Cloudflare Pages에 반복 가능하고 안전하게 배포하기 위한 체크리스트입니다.

## 1. 사전 요구 사항

| 항목 | 버전 / 값 |
| --- | --- |
| Node.js | `>=24.14.0 <25` (package.json `engines`) |
| pnpm | `>=11.5.2 <12` (`packageManager: pnpm@11.5.2`) |
| 패키지 매니저 | **pnpm 필수** (npm/yarn 사용 금지) |
| 빌드 어댑터 | `@sveltejs/adapter-cloudflare` |

> CI(`.github/workflows/ci.yml`)는 Node 24 + pnpm 환경에서 동일한 검증을 수행합니다.

## 2. 로컬 검증 (배포 전 필수)

```bash
pnpm install --frozen-lockfile   # 잠금 파일 그대로 설치
pnpm check                       # strict 타입 검사
pnpm test                        # Vitest 단위 테스트
pnpm audit --audit-level moderate # moderate 이상 취약점 점검
pnpm build                       # 프로덕션 빌드
pnpm preview                     # (선택) 로컬에서 프로덕션 결과 미리보기 (port 3000)
```

모두 통과해야 배포를 진행합니다.

## 3. Cloudflare Pages 설정

Cloudflare Pages 프로젝트(대시보드 또는 `wrangler`) 설정값:

| 설정 | 값 |
| --- | --- |
| Framework preset | SvelteKit |
| Build command | `pnpm build` |
| Build output directory | `.svelte-kit/cloudflare` |
| Node version | 24 (환경 변수 `NODE_VERSION=24` 또는 `.node-version`) |
| Package manager | pnpm (lockfile 자동 감지) |

`wrangler.toml`에 이미 정의되어 있습니다:

```toml
name = "linewiki"
compatibility_date = "2024-11-01"
pages_build_output_dir = ".svelte-kit/cloudflare"
```

- **`pages_build_output_dir`**: `adapter-cloudflare` 산출물 경로와 일치합니다. 변경하지 마세요.
- **`compatibility_date`**: Workers 런타임 동작 기준일입니다. 갱신할 경우 반드시
  **프리뷰 배포에서 전체 라우트(`/`, `/fen/...`, `/privacy`)와 로컬 분석 Web Worker가
  정상 동작하는지 확인한 후** 프로덕션에 반영하세요. 무검증 상태로 올리지 않습니다.

## 4. 보안 헤더 체크리스트

- 루트 `_headers` 파일이 보안 헤더를 정의합니다(빌드 시 불변 자산 캐시 블록이 자동 병합됨).
- 배포 후 응답 헤더를 확인하세요:
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - [ ] `Cross-Origin-Opener-Policy: same-origin`
  - [ ] `Cross-Origin-Resource-Policy: same-origin`
  - [ ] `Content-Security-Policy-Report-Only` 존재 (위반 보고 확인 후 enforced 승격 검토)
- CSP를 enforced(`Content-Security-Policy`)로 승격하기 전 브라우저 콘솔에서 위반이 없는지 확인합니다.
- 멀티스레드 Stockfish WASM(SharedArrayBuffer) 도입 시 COOP/COEP 조합을 추가하되,
  모든 정적 자산의 CORP/CORS 적합성을 먼저 검증합니다.

## 5. 환경 변수

- 오픈베타 0은 **필수 환경 변수가 없습니다**(정적 클라이언트 앱). `.env.example` 참고.
- 비밀 값은 절대 커밋하지 않습니다(`.gitignore`가 `.env`, `.env.*`, `.dev.vars`를 제외).
- 서버 기능(로그인/원격 분석/외부 API) 도입 시:
  - Cloudflare Pages 대시보드의 **Environment variables / Secrets**에만 저장합니다.
  - 코드/리포지토리에 키를 하드코딩하지 않습니다.

## 6. 개인정보 체크리스트 (서버 기능 활성화 전)

서버 측 데이터 처리(계정/주석 저장/원격 분석/외부 API/분석 도구)를 켜기 전:

- [ ] `docs/privacy-pipa-readiness.md`의 PIPA 체크리스트를 통과했는가?
- [ ] `/privacy` 페이지를 실제 동작에 맞게 갱신했는가?
- [ ] 로그/텔레메트리에서 `redactFen()`으로 FEN을 비식별 처리하고 있는가?
- [ ] 제3자 전송(예: 외부 통계 API)에 대한 고지·동의 절차가 마련되었는가?

## 7. 롤백

- Cloudflare Pages 대시보드 → 프로젝트 → **Deployments**에서 직전 정상 배포를 선택해
  **Rollback**(또는 해당 배포를 Production으로 승격)합니다.
- 코드 차원 롤백이 필요하면 문제 커밋을 `git revert` 후 다시 배포합니다
  (히스토리 보존을 위해 force-push 대신 revert 사용).
- 롤백 후 §4 보안 헤더와 핵심 라우트가 정상인지 재확인합니다.

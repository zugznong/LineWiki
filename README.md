# LineWiki (라인위키)

LineWiki는 FEN 하나로 체스 포지션 페이지를 열고, 해당 포지션의 후보수와 임시 로컬 어시스턴스 분석을 확인할 수 있는 체스 라인 연구 도구입니다.

장기적으로는 유저 주석, 토론, 외부 실전 통계, 서버 분석, 연구 DB를 결합하여 **체스 라인을 URL 단위로 공유하고 연구하는 위키형 플랫폼**으로 확장될 것입니다.

---

## 🚀 1. 프로젝트 개요 및 핵심 원칙
- **URL 중심 설계**: 모든 체스 포지션은 FEN 문자열 자체를 URL에 인코딩(`_` 변환 적용)하여 상태를 복원하고 유일한 링크로 공유가능합니다.
- **오픈베타 0 (Local Engine & Client-First)**: BaaS, 사용자 로그인, 복잡한 서버 분석 기능을 배제하고, 클라이언트 단독 구동 및 로컬 분석 핵심 경험 설계에 집중합니다.
- **로컬 분석기**: 오픈베타 0의 로컬 분석기는 대용량 Stockfish WASM 리소스 로드 부담과 브라우저 UI 호환성을 고려하여, **UCI 프로토콜을 온전히 준수하는 Stockfish 호환 mock/fallback 로컬 휴리스틱 분석 엔진**이 탑재되어 있습니다. 웹 워커(Web Worker) 상에서 UI 블로킹 없이 브라우저단 세부 평가 추이를 시뮬레이션 산출해 주며, 정식 배포나 오프라인 버전 전환 시 실제 Stockfish 16 WASM (용량 최적화를 위해 static/stockfish/stockfish.wasm.placeholder.txt로 대체, 가이드에 따라 교체 가능) 엔진 패키지로 직접 교체하기 편리하도록 완전한 UCI 표준 통신 설계(UCI 인터페이스)를 갖추고 있습니다.
- **세션 히스토리**: 브라우저가 유지되는 동안 `sessionStorage`에 실시간으로 수순 이동 히스토리를 저장하여 브라우저 뒤로가기/앞으로가기 및 수순 이동 내역을 기록합니다.
- **보드 설정**: 테마 및 기물 형태 등 사용자의 개인 설정을 `localStorage`에 정적으로 보존합니다.

---

## 🛠️ 2. 오픈베타 0 구현 범위 및 기여(PR) 가이드

오픈베타 0은 **외부 서비스를 연동하지 않고 독립(Stand-alone) 클라이언트 상태로 로컬 분석 및 기본 전달 UX 가치를 빠르게 입증하는 것**을 최우선 목표로 합니다. 기여를 희망하시는 경우, 아래의 PR 범위를 엄격히 지켜 주세요.

### 📦 포함 기능 및 권장되는 PR 범위
- **클라이언트단 기능 개선**: 체스보드 렌더링 품질 상승, 미세한 UX 편의 개선 (단축키 지원 등)
- **모바일/태블릿 UI 최적화**: 미디어 쿼리 누락이나 화면비율 찌그러짐 현상의 정교한 해결
- **로컬 분석기/Worker 성능 개선**: Stockfish Web Worker 통신 부하 줄이기 및 멀티스레드 지원 조율
- **버그 패치**: FEN 변환 오류 예외 처리 보강, 비정상 보드 이동 초기화 무결성 안전장치 추가

### 🚫 수용 불가능한 기능 (PR 제출 시 실시간 반려 대상)
장기 로드맵에는 존재하나, 오픈베타 0에서는 **유지비 발생, 구조 거대화 차단, 아키텍처 결합 방지**를 위해 **절대로 반영하지 않는** 기능들입니다:
- **로그인 및 데이터베이스 연동**: Firebase Admin SDK, Supabase 등의 BaaS 및 외부 인프라 주입 PR
- **서버 컴퓨터 연계 스택**: 실제 Stockfish 엔진 서버, RunPod, AWS EC2 원격 백엔드 설계 파트 추가
- **기획에 없는 미요청 추가 피처**: AI가 자연어로 해설해 주는 오프닝 가이드, PGN 대형 파일 다중 업로드 플래너, 실시간 음성 강의, 보드판 기물 다중 마우스 드래그 앤 드롭 등

### 🚫 제외 및 Placeholder 처리 대상 (오픈베타 0)
- 로그인 및 회원 상태 관리 (Firebase/Supabase 배제)
- 서버 분석 요청 및 RunPod 연동 (비활성화 및 UI Placeholder로 배치)
- 게시판/실시간 토론/사용자 주석 기능 (클라이언트 단 dummy 뷰 구성)
- Lichess/Chess.com 경기 외부 통계 연동 (UI 껍데기만 남겨 비활성화)
- PGN 파일 파싱 및 오프닝 자동 명칭 탐색 시스템

---

## 📁 3. 주요 디렉터리 구성 (DIP 및 계층형 모델 설계)

LineWiki는 확장성과 안정성을 보장하기 위해 다음과 같은 엄격한 설계 계층을 보존합니다:
- **`routes/`**: 엔트리포인트 매핑 및 SvelteKit URL 바인딩 담당
- **`domain/`**: 체스 규칙, 평가 모델, 보드 테마 등 인프라에 결함이 없는 순수 도메인 스키마
- **`application/`**: UseCase 기반 유저 동작 및 상태 전사 흐름 제어
- **`ports/`**: 체스 엔진, 로컬 분석, 영속 저장소, 네비게이션 표준 인터페이스 정의
- **`adapters/`**: `chess.js`, Stockfish 호환 mock/fallback 로컬 휴리스틱 분석기 및 실제 `Stockfish WASM` 통합용 어댑터, 브라우저 Storage 등 구체적인 라이브러리 연동부
- **`styles/`**: 기기별 반응형 쿼리 및 UI 전반 토큰 최적화

---

## 💻 4. 명령 실행 및 관리 방법

### 개발 환경 빌드 및 의존성 설치
```bash
# 개발 의존성 및 라이브러리 설치
pnpm install

# 로컬 개발 서버 기동 (Port 3000 강제 설정)
pnpm dev
```

### 정적 및 SSR 프로덕션 컴파일 (Cloudflare Pages 타겟)
```bash
# SvelteKit + Cloudflare Pages Adaptor 정적 산출물 빌드
pnpm build

# 빌드 결과 미리보기
pnpm preview
```

### 타입 검사 및 비즈니스 로직 테스트
```bash
# strict 타입 확인
pnpm check

# 도메인/유스케이스 단위 비즈니스 로직 단위 테스트 수행 (Vitest)
pnpm test
```

---

## 🌐 5. 향후 로드맵 (오픈베타 이후 검토 기능)
1. 보드 테마 및 커스텀 컬러링 강화 및 대비 무결성 체크 기능
2. [오픈베타 이후 검토] Firebase/사용자 ID 기반의 영속성 주석 플랫폼 아키텍처 및 로그인 연동 검수
3. [오픈베타 이후 검토] 연구 포지션 링크 연계용 토론 및 정적 커뮤니티 게시판 모델
4. [오픈베타 이후 검토] 마스터 경기 통계 연합 피드 연계 및 Lichess Explorer API 연동 검토
5. [오픈베타 이후 검토] 원격 서버 자원을 활용한 대용량 Stockfish 분석 API 연동 검토

---

## 🤝 6. 기여자 (Contributors)

Special thanks to:

* [@VectorSophie](https://github.com/VectorSophie) — 오픈베타 0의 보안, 개인정보 안내, CI, 배포 문서, FEN/네비게이션 안전성, 로컬 분석 Worker 생애주기, 평가 정렬 및 브라우저 저장소 테스트 개선안을 제안해 주셨습니다.


## 📄 7. 라이선스 고지 (License)
- **전체 라이선스**: LineWiki 솔루션은 오픈소스 **GNU General Public License v3.0 (GPL-3.0-or-later)** 하에 배포됩니다. 본 프로젝트는 Free Software Foundation이 공표한 GNU General Public License v3.0 또는 그 이후에 발표되는 모든 최신 개정 버전(GPL-3.0-or-later)을 준수하며, 어떠한 배포 규격에서도 "GPL v3.0 또는 그 이후의 버전" 조건 중 선택하여 법적 권리를 행사할 수 있습니다.
- **Stockfish 통합 라이선스**: 이 서비스는 오픈소스 체스 엔진인 **Stockfish** 또는 Stockfish 기반 구성요소(WASM/JS 포팅 등)를 기획에 따라 포함하거나 실행합니다. Stockfish 엔진의 원본 소스코드는 [Stockfish 공식 GitHub](https://github.com/official-stockfish/Stockfish)에서 제공되며, 독자적인 GPL-3.0 복사조건(copyleft)을 엄격하게 준수합니다.
- **로컬 휴리스틱 백업**: 복잡한 환경이나 fallback 상황에서 구동되는 로컬 휴리스틱 모의 엔진(LineWiki Heuristics Fallback Engine) 역시 GPL-3.0 조항 하에 소스코드의 결합 가용성이 보증됩니다.

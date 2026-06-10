<script lang="ts">
  import { ShieldCheck, Database, HardDrive, AlertTriangle, Trash2, ArrowLeft } from '@lucide/svelte';

  // 마지막 갱신일 — 데이터 처리 방식이 바뀌면 함께 갱신합니다.
  const lastUpdated = '2026-06-10';
</script>

<svelte:head>
  <title>개인정보 처리방침 · LineWiki</title>
  <meta name="description" content="LineWiki 오픈베타 0의 데이터 처리 방식 안내 및 향후 PIPA 대응 준비 사항" />
</svelte:head>

<div class="flex-1 bg-slate-950 px-4 py-12 md:py-16">
  <div class="w-full max-w-2xl mx-auto space-y-8">

    <a href="/" class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition">
      <ArrowLeft size={15} />
      시작 화면으로
    </a>

    <header class="space-y-3">
      <div class="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-medium">
        <ShieldCheck size={14} />
        오픈베타 0 · 데이터 처리 안내
      </div>
      <h1 class="text-3xl md:text-4xl font-bold text-white">개인정보 처리방침</h1>
      <p class="text-slate-400 text-sm leading-relaxed">
        LineWiki는 현재 <strong class="text-slate-200">오픈베타 0</strong> 단계로, 별도의 회원가입이나 서버 저장 없이
        브라우저 안에서만 동작하는 클라이언트 전용 도구입니다. 이 문서는 현재 버전이 실제로 다루는 데이터의 범위를 투명하게 안내합니다.
      </p>
      <p class="text-xs text-slate-500">최종 업데이트: {lastUpdated}</p>
    </header>

    <!-- 현재(오픈베타 0) 동작 -->
    <section class="space-y-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <Database size={18} class="text-emerald-400" />
        지금(오픈베타 0) 처리하는 데이터
      </h2>
      <ul class="space-y-2.5 text-sm text-slate-300 leading-relaxed">
        <li class="flex gap-2"><span class="text-emerald-500 shrink-0">•</span><span><strong class="text-slate-100">계정 시스템이 없습니다.</strong> 로그인, 회원가입, 사용자 ID가 존재하지 않습니다.</span></li>
        <li class="flex gap-2"><span class="text-emerald-500 shrink-0">•</span><span><strong class="text-slate-100">공개 사용자 프로필이 없습니다.</strong> 다른 이용자에게 노출되는 개인 식별 정보가 없습니다.</span></li>
        <li class="flex gap-2"><span class="text-emerald-500 shrink-0">•</span><span><strong class="text-slate-100">서버에 주석/노트를 저장하지 않습니다.</strong> 개인 노트·토론 기능은 비활성화된 자리표시자입니다.</span></li>
        <li class="flex gap-2"><span class="text-emerald-500 shrink-0">•</span><span><strong class="text-slate-100">서버 분석을 수행하지 않습니다.</strong> 모든 평가는 브라우저 내 로컬 임시 분석기에서만 계산됩니다.</span></li>
      </ul>
    </section>

    <!-- 브라우저 저장소 -->
    <section class="space-y-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <HardDrive size={18} class="text-emerald-400" />
        브라우저에 저장되는 정보
      </h2>
      <div class="space-y-3 text-sm text-slate-300 leading-relaxed">
        <p>
          다음 정보는 서버로 전송되지 않으며, 오직 <strong class="text-slate-100">사용자 본인의 브라우저</strong>에만 보관됩니다.
        </p>
        <ul class="space-y-2.5">
          <li class="flex gap-2"><span class="text-emerald-500 shrink-0">•</span><span><strong class="text-slate-100">보드 설정</strong>(테마·기물 스타일·보드 방향)은 <code class="text-emerald-300 text-xs bg-slate-900/60 px-1 py-0.5 rounded">localStorage</code>에 저장되어 다음 방문 시에도 유지됩니다.</span></li>
          <li class="flex gap-2"><span class="text-emerald-500 shrink-0">•</span><span><strong class="text-slate-100">수순·라인 이동 기록</strong>은 <code class="text-emerald-300 text-xs bg-slate-900/60 px-1 py-0.5 rounded">sessionStorage</code>에 저장되며, 탭/창을 닫으면 사라집니다.</span></li>
        </ul>
      </div>
    </section>

    <!-- 데이터 삭제 -->
    <section class="space-y-3">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <Trash2 size={18} class="text-emerald-400" />
        내 데이터 삭제 방법
      </h2>
      <p class="text-sm text-slate-300 leading-relaxed">
        브라우저 설정에서 이 사이트의 저장소(쿠키 및 사이트 데이터)를 삭제하면 위의 로컬 데이터가 모두 제거됩니다.
        시크릿/프라이빗 모드로 접속하면 종료 시 자동으로 삭제됩니다.
      </p>
    </section>

    <!-- 향후 기능 경고 -->
    <section class="space-y-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-amber-300">
        <AlertTriangle size={18} class="text-amber-400" />
        향후 기능 도입 시 변경 예정 안내
      </h2>
      <div class="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 space-y-3 text-sm text-amber-100/90 leading-relaxed">
        <p>
          아래 기능은 아직 제공되지 않습니다. 도입 시점에는 본 방침이 갱신되고, 개인정보 보호법(PIPA)에 따른
          <strong>수집 목적 고지, 동의 절차, 보관 기간, 삭제·열람(다운로드) 요청 경로, 제3자 제공 고지</strong> 등이 함께 마련됩니다.
        </p>
        <ul class="space-y-1.5 text-amber-100/80">
          <li class="flex gap-2"><span class="shrink-0">•</span><span>로그인 / 사용자 ID 기반 계정</span></li>
          <li class="flex gap-2"><span class="shrink-0">•</span><span>개인 주석(노트) 및 연구 데이터의 서버 저장</span></li>
          <li class="flex gap-2"><span class="shrink-0">•</span><span>포지션별 토론·커뮤니티 게시판</span></li>
          <li class="flex gap-2"><span class="shrink-0">•</span><span>외부 체스 통계 API(Lichess/Chess.com 등) 연동</span></li>
          <li class="flex gap-2"><span class="shrink-0">•</span><span>원격 서버 기반 Stockfish 분석</span></li>
          <li class="flex gap-2"><span class="shrink-0">•</span><span>접속 분석(analytics)·텔레메트리</span></li>
        </ul>
      </div>
    </section>

    <footer class="pt-4 border-t border-slate-900 text-xs text-slate-500 leading-relaxed">
      <p>
        본 문서는 오픈베타 0의 실제 동작을 설명하기 위한 안내이며, 완전한 법적 준수를 보증하는 문구가 아닙니다.
        기능 확장 시 정식 개인정보 처리방침으로 갱신됩니다.
      </p>
    </footer>

  </div>
</div>

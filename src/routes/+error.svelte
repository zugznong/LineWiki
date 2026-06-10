<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="flex flex-col items-center justify-center min-h-screen bg-[#121214] text-[#e4e4e7] font-sans p-6" id="error-screen-container">
  <div class="w-full max-w-md bg-[#1a1a1e] rounded-xl shadow-2xl border border-[#2d2d34] p-8 text-center" id="error-card">
    <div class="mb-6" id="error-status-badge-container">
      <span class="inline-block px-4 py-1.5 bg-red-900/20 text-red-400 font-mono text-sm rounded-full border border-red-500/20" id="error-status-badge">
        STATUS CODE: {$page.status}
      </span>
    </div>
    
    <h1 class="text-2xl font-bold mb-4 tracking-tight text-white leading-snug" id="error-title">
      포지션을 로드할 수 없습니다
    </h1>
    
    <p class="text-sm text-[#a1a1aa] mb-6 leading-relaxed" id="error-description">
      {$page.error?.message || '요청하신 포지션 데이터를 분석하는 과정에서 예기치 못한 에러가 발생했거나 보안 상태 검증에 실패했습니다.'}
    </p>

    <div class="flex flex-col gap-3" id="error-action-container">
      <a
        href="/"
        class="inline-flex items-center justify-center px-4 py-2.5 bg-[#769656] text-white hover:bg-opacity-90 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md"
        id="btn-error-back-to-home"
      >
        처음으로 돌아가기
      </a>
    </div>
  </div>
</div>

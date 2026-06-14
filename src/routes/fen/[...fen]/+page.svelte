<script lang="ts">
  import PositionPageShell from '$lib/components/position/PositionPageShell.svelte';
  import PositionFallback from '$lib/components/position/PositionFallback.svelte';
  import { onMount } from 'svelte';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { sessionHistoryStore } from '$lib/stores/sessionHistoryStore.svelte.ts';
  import { lineHistoryStore } from '$lib/stores/lineHistoryStore.svelte.ts';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { Fen } from '$lib/domain/chess/Fen';

  let { data } = $props();
  let lastAnalyzedFen = '';
  let currentGeneration = 0;

  function updateHighlightOnly(fen: string) {
    let lastMove = null;
    const historyList = lineHistoryStore.historyItems;
    if (historyList && historyList.length > 0) {
      const matched = historyList.slice().reverse().find(item => {
        const itemNormalized = Fen.create(item.fen).map(f => f.toString()).unwrapOrDefault(item.fen);
        const posNormalized = Fen.create(fen).map(f => f.toString()).unwrapOrDefault(fen);
        return itemNormalized === posNormalized;
      });
      if (matched && matched.from && matched.to) {
        lastMove = { from: matched.from, to: matched.to };
      }
    }
    positionStore.setLastMove(lastMove);
  }

  function analyzeFen(fen: string) {
    const normalizedFen = Fen.create(fen).map(f => f.toString()).unwrapOrDefault(fen);
    if (lastAnalyzedFen === normalizedFen) {
      return;
    }

    const services = createAppServices();
    const positionRes = services.createPosition.execute(fen);
    
    if (positionRes.isOk()) {
      const position = positionRes.unwrap();
      try {
        const candidateMoves = services.generateCandidateMoves.execute(fen);

        const historyFens = lineHistoryStore.historyItems.map(item => item.fen);
        const drawState = services.chessEngine.getDrawState(fen, historyFens);
        positionStore.setPosition(position, candidateMoves.moves, null, drawState);
        
        // FEN이 변경될 때 가동중이던 이전 분석 세션을 정지하고 세대 번호를 증가시킵니다.
        currentGeneration++;
        
        // 분석 가드 FEN 설정
        lastAnalyzedFen = normalizedFen;
        
        services.startCandidateAnalysis.execute(fen, candidateMoves.moves, currentGeneration);
      } catch (e) {
        lastAnalyzedFen = '';
        positionStore.setError('포지션 분석 후보수 생성 오류 발생');
      }
    } else {
      lastAnalyzedFen = '';
      positionStore.setError('포지션을 불러오는 중 오류가 발생했습니다.');
    }
  }

  onMount(() => {
    // 최초 진입 시 명시적으로 lineHistoryStore 세션 히스토리 복원 및 탑바 활성 캐시 구축
    lineHistoryStore.init();

    if (data.isValid && data.fen) {
      updateHighlightOnly(data.fen);
    } else if (!data.isValid) {
      positionStore.setError(data.error || '유효하지 않은 FEN 포지션 코드입니다.');
    }

    return () => {
      // 페이지 이탈 시에는 stop이 아니라 dispose로 worker 자원까지 정리합니다.
      const services = createAppServices();
      services.disposeLocalAnalysis.execute();
    };
  });

  // FEN 데이터를 Reactive 감시하여 단 한번만 안전하게 분석이 기동되도록 단일 FEN 분석 연동
  $effect(() => {
    if (data.isValid && data.fen) {
      positionStore.setError(null);
      analyzeFen(data.fen);
    }
  });

  // FEN 혹은 세션 히스토리가 실시간으로 갱신될 때 언제나 하이라이트를 즉각 업데이트
  $effect(() => {
    if (data.isValid && data.fen) {
      const _historyVersion = sessionHistoryStore.version;
      const _items = lineHistoryStore.historyItems;
      updateHighlightOnly(data.fen);
    }
  });
</script>

{#if !data.isValid}
  <PositionFallback error={data.error} />
{:else}
  <PositionPageShell />
{/if}

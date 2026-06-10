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
    if (lastAnalyzedFen === fen) {
      return;
    }
    lastAnalyzedFen = fen;

    const services = createAppServices();
    const positionRes = services.createPosition.execute(fen);
    
    if (positionRes.isOk()) {
      const position = positionRes.unwrap();
      const candidateMoves = services.generateCandidateMoves.execute(fen);

      positionStore.setPosition(position, candidateMoves.moves, null);
      
      // Stop current active Stockfish calculation and trigger new layout analysis
      services.stopLocalAnalysis.execute();
      services.startLocalAnalysis.execute(fen, candidateMoves.moves);
    } else {
      positionStore.setError('포지션을 불러오는 중 오류가 발생했습니다.');
    }
  }

  onMount(() => {
    // 최초 진입 시 명시적으로 lineHistoryStore 세션 히스토리 복원 및 탑바 활성 캐시 구축
    lineHistoryStore.init();

    if (data.isValid && data.fen) {
      analyzeFen(data.fen);
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

  // 1. URL의 FEN이 변경되었을 때만 분석을 재실행 (동작 캐싱 가드 적용)
  $effect(() => {
    if (data.isValid && data.fen) {
      analyzeFen(data.fen);
    }
  });

  // 2. FEN 혹은 세션 히스토리가 실시간으로 갱신될 때 언제나 하이라이트를 즉각 업데이트
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

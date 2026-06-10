<script lang="ts">
  import PositionPageShell from '$lib/components/position/PositionPageShell.svelte';
  import PositionFallback from '$lib/components/position/PositionFallback.svelte';
  import { onMount } from 'svelte';
  import { positionStore } from '$lib/stores/positionStore.svelte.ts';
  import { createAppServices } from '$lib/composition/createAppServices';
  import { Fen } from '$lib/domain/chess/Fen';

  let { data } = $props();
  let lastAnalyzedFen = '';

  function analyzeFen(fen: string) {
    if (lastAnalyzedFen === fen) return;
    lastAnalyzedFen = fen;

    const services = createAppServices();
    const positionRes = services.createPosition.execute(fen);
    
    if (positionRes.isOk()) {
      const position = positionRes.unwrap();
      const candidateMoves = services.generateCandidateMoves.execute(fen);

      let lastMove = null;
      const historyRes = services.restoreLineHistory.execute();
      if (historyRes.isOk()) {
        const historyList = historyRes.unwrap();
        const matched = historyList.slice().reverse().find(item => {
          const itemNormalized = Fen.create(item.fen).map(f => f.toString()).unwrapOrDefault(item.fen);
          const posNormalized = Fen.create(position.fen).map(f => f.toString()).unwrapOrDefault(position.fen);
          return itemNormalized === posNormalized;
        });
        if (matched && matched.from && matched.to) {
          lastMove = { from: matched.from, to: matched.to };
        }
      }

      positionStore.setPosition(position, candidateMoves.moves, lastMove);
      
      // Stop current active Stockfish calculation and trigger new layout analysis
      services.stopLocalAnalysis.execute();
      services.startLocalAnalysis.execute(fen, candidateMoves.moves);
    } else {
      positionStore.setError('포지션을 불러오는 중 오류가 발생했습니다.');
    }
  }

  onMount(() => {
    if (data.isValid && data.fen) {
      analyzeFen(data.fen);
    } else if (!data.isValid) {
      positionStore.setError(data.error || '유효하지 않은 FEN 포지션 코드입니다.');
    }

    return () => {
      // 라우트 이탈 시 분석을 중단하고 백그라운드 워커/타이머를 완전히 해제합니다.
      const services = createAppServices();
      services.disposeLocalAnalysis.execute();
    };
  });

  // Keep store in sync when user navigates URLs
  $effect(() => {
    if (data.isValid && data.fen) {
      analyzeFen(data.fen);
    }
  });
</script>

{#if !data.isValid}
  <PositionFallback error={data.error} />
{:else}
  <PositionPageShell />
{/if}

import type { LocalAnalysisResult } from '../../domain/analysis/LocalAnalysisResult';

/**
 * MultiPV 탐색 시 개별 루트 후보수(1...N)가 각기 다른 타이밍에 출력하는 점수(Depth N)를
 * 하나로 묶어 '완성형 차트 프레임' 단위로 안정화 및 누적 배출하는 오케스트레이터입니다.
 */
export class MultiPvFrameAccumulator {
  private expectedCount: number = 0;
  // depth -> (multiPvIndex -> LocalAnalysisResult)
  private frames: Map<number, Map<number, LocalAnalysisResult>> = new Map();
  private maxCompletedDepth: number = -1;
  private lastBestFrame: LocalAnalysisResult[] = [];

  constructor(expectedCount: number) {
    this.expectedCount = expectedCount;
  }

  /**
   * 기대하는 타겟 피스/후보수 개수를 갱신합니다.
   */
  public setExpectedCount(count: number): void {
    this.expectedCount = count;
  }

  /**
   * 개별 분석 결과를 누적 큐에 할당합니다.
   * 한 depth 내에서 예상 후보수 개수(expectedCount)를 완전 충족 시, 가용 프레임을 정렬하여 최신 완성본으로 즉시 리턴합니다.
   */
  public addResult(result: LocalAnalysisResult): LocalAnalysisResult[] | null {
    if (this.expectedCount <= 0) return null;

    const depth = result.depth;
    const pvi = result.multiPvIndex;

    if (!this.frames.has(depth)) {
      this.frames.set(depth, new Map());
    }

    const depthMap = this.frames.get(depth)!;
    // multipv index를 키로 삼아 누적 덮어쓰기
    depthMap.set(pvi, result);

    const uniquePvCount = depthMap.size;

    // 만약 목표하는 후보수 개수만큼 결과가 채워졌다면 완성 프레임으로 처리
    if (uniquePvCount >= this.expectedCount) {
      const completedFrame = Array.from(depthMap.values());
      // 오름차순으로 항상 균일한 multiPvIndex 정렬 수행
      completedFrame.sort((a, b) => (a.multiPvIndex || 0) - (b.multiPvIndex || 0));

      if (depth > this.maxCompletedDepth) {
        this.maxCompletedDepth = depth;
        this.lastBestFrame = completedFrame;

        // 메모리 정화 조치: 최신 완성 depth 및 인접 수색 depth(1~2단계 하단)를 제외한 낡은 depth map을 청소하여 노드 수색 메모리 누수를 원천 봉쇄합니다.
        const keepThreshold = this.maxCompletedDepth - 2;
        for (const d of Array.from(this.frames.keys())) {
          if (d < keepThreshold) {
            this.frames.delete(d);
          }
        }

        return completedFrame;
      }
    }

    return null;
  }

  /**
   * 분석이 멈추거나 잦은 도중에, 지금까지 누적된 미완성 프레임 목록 중
   * 가장 수집 밀도가 높고(개수가 많은) 깊이가 깊은 유효 프레임을 최종 반환합니다.
   */
  public getFinalBestFrame(): LocalAnalysisResult[] {
    if (this.lastBestFrame.length > 0) {
      this.lastBestFrame.sort((a, b) => (a.multiPvIndex || 0) - (b.multiPvIndex || 0));
      return this.lastBestFrame;
    }

    let bestDepth = -1;
    let maxCount = -1;
    let bestFrame: LocalAnalysisResult[] = [];

    for (const [depth, depthMap] of this.frames.entries()) {
      const results = Array.from(depthMap.values());
      if (results.length > maxCount || (results.length === maxCount && depth > bestDepth)) {
        maxCount = results.length;
        bestDepth = depth;
        bestFrame = results;
      }
    }

    bestFrame.sort((a, b) => (a.multiPvIndex || 0) - (b.multiPvIndex || 0));
    return bestFrame;
  }

  /**
   * 프레임 버퍼를 말끔히 비웁니다.
   */
  public clear(): void {
    this.frames.clear();
    this.maxCompletedDepth = -1;
    this.lastBestFrame = [];
  }
}

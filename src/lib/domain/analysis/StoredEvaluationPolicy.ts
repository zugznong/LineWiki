import type { EngineMoveEvaluation } from './AnalysisTypes';

export interface PolicyOptions {
  minDepth?: number;
  maxAgeMs?: number;
  minTrustedDepth?: number;
  allowedEngineVersions?: string[];
  allowedPerspectives?: string[];
  allowMissingDate?: boolean;
  minSampleCount?: number;
  maxStdDev?: number;
}

export class StoredEvaluationPolicy {
  private minDepth: number;
  private maxAgeMs: number;
  private minTrustedDepth: number;
  private allowedEngineVersions?: string[];
  private allowedPerspectives?: string[];
  private allowMissingDate: boolean;
  private minSampleCount: number;
  private maxStdDev: number;

  constructor(options: PolicyOptions = {}) {
    this.minDepth = options.minDepth ?? 18;
    this.maxAgeMs = options.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000; // 30 days
    this.minTrustedDepth = options.minTrustedDepth ?? 18;
    this.allowedEngineVersions = options.allowedEngineVersions; // 명시적으로 주어졌을 때만 타겟 체크
    this.allowedPerspectives = options.allowedPerspectives; // 명시적으로 주어졌을 때만 타겟 체크
    this.allowMissingDate = options.allowMissingDate ?? true; // 하위 호환성 및 테스트 안정성을 위해 기본값 true
    this.minSampleCount = options.minSampleCount ?? 1;
    this.maxStdDev = options.maxStdDev ?? 50;
  }

  /**
   * DB 평가 상태를 분석하여 분류합니다.
   * - 'missing': 데이터 없음
   * - 'trusted': 데이터가 존재하고, 최소 depth/trustedDepth 및 유효기간을 만족하여 신뢰 가능함
   * - 'needsRefresh': 데이터는 있으나, depth 기준 미달이거나 유효기간이 초과하여 로컬 재분석이 필요함
   */
  public evaluateStatus(
    stored: EngineMoveEvaluation | undefined,
    meta?: {
      isTrusted?: boolean;
      reason?: string;
      engineVersion?: string;
      sampleCount?: number;
      stdDev?: number;
      perspective?: string;
    }
  ): 'missing' | 'trusted' | 'needsRefresh' {
    if (!stored) {
      return 'missing';
    }

    // meta 레벨의 isTrusted 지시어 우선 참고
    if (meta && meta.isTrusted === false) {
      return 'needsRefresh';
    }

    const depth = stored.depth ?? 0;
    const trustedDepth = stored.trustedDepth ?? 0;

    // depth 또는 trustedDepth가 기준들에 충족하는지 판단
    const depthCriteria = depth >= this.minDepth;
    const trustedDepthCriteria = trustedDepth >= this.minTrustedDepth;

    if (!depthCriteria && !trustedDepthCriteria) {
      return 'needsRefresh';
    }

    // 시간 경과 판단 (Number.isFinite 및 Date.parse 엄밀 검증)
    const dateStr = stored.updatedAt || stored.createdAt;
    if (dateStr) {
      const parsedTime = Date.parse(dateStr);
      if (!Number.isFinite(parsedTime)) {
        return 'needsRefresh';
      }
      const ageMs = Date.now() - parsedTime;
      if (ageMs > this.maxAgeMs) {
        return 'needsRefresh';
      }
    } else {
      // 날짜가 누락된 경우의 정책 처리
      if (!this.allowMissingDate) {
        return 'needsRefresh';
      }
    }

    // 엔진 버전 검증
    const engineVersion = meta?.engineVersion || (stored as any).engineVersion;
    if (engineVersion && this.allowedEngineVersions) {
      const isAllowed = this.allowedEngineVersions.some(
        v => engineVersion.toLowerCase().includes(v.toLowerCase())
      );
      if (!isAllowed) {
        return 'needsRefresh';
      }
    }

    // 평가 관점 버전 검증
    const perspective = meta?.perspective || (stored as any).perspective;
    if (perspective && this.allowedPerspectives) {
      const isAllowed = this.allowedPerspectives.some(
        p => perspective.toLowerCase() === p.toLowerCase()
      );
      if (!isAllowed) {
        return 'needsRefresh';
      }
    }

    // 합산 횟수 및 표준편차 검증 (meta 정보 활용)
    if (meta) {
      if (meta.sampleCount !== undefined && meta.sampleCount < this.minSampleCount) {
        return 'needsRefresh';
      }
      if (meta.stdDev !== undefined && meta.stdDev > this.maxStdDev) {
        return 'needsRefresh';
      }
    }

    return 'trusted';
  }

  public isTrusted(stored: EngineMoveEvaluation | undefined, meta?: any): boolean {
    return this.evaluateStatus(stored, meta) === 'trusted';
  }

  public needsRefresh(stored: EngineMoveEvaluation | undefined, meta?: any): boolean {
    return this.evaluateStatus(stored, meta) === 'needsRefresh';
  }

  public isMissing(stored: EngineMoveEvaluation | undefined, meta?: any): boolean {
    return this.evaluateStatus(stored, meta) === 'missing';
  }
}

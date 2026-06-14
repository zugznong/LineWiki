import type { EngineMoveEvaluation } from '../domain/analysis/AnalysisTypes';
import type { LocalAnalysisResult } from '../domain/analysis/LocalAnalysisResult';

export type AnalysisStatus = 
  | 'idle' 
  | 'ready' 
  | 'analyzing' 
  | 'analyzing-deeper'
  | 'depth-progress' 
  | 'completed' 
  | 'fallback-completed'
  | 'error'
  | 'stockfish-failed'
  | 'fallback-running'
  | 'fallback-disabled'
  | 'fallback-failed'
  | 'analysis-unavailable'
  | 'restarting'
  | 'transitioning'
  | 'waiting-ready';

export type RestartReason = 'move-transition' | 'settings-change' | 'worker-error' | 'uci-timeout' | 'asset-failed' | null;

/**
 * 브라우저 로컬 백그라운드 스레드(Web Worker)에서 기동되는 Stockfish 분석 엔진의 실시간 진행 현황을 관제하는 스토어입니다.
 * 엔진 로딩 상태(준비/분석중/완료/오류), FEN 후보수별 기보 가치 평가 점수(Evaluations)를 관리합니다.
 */
class LocalAnalysisStore {
  private provisionalEvaluation: EngineMoveEvaluation | null = null;
  private state = $state<{
    status: AnalysisStatus;
    evaluations: Record<string, EngineMoveEvaluation>;
    candidateMoves: any[];
    errorMessage: string | null;
    completedFrameDepth: number | null;
    targetDepth: number;
    targetCount: number;
    resolvedCount: number;
    nodes: number;
    nps: number;
    peakNps: number;
    engineMode: 'stockfish' | 'fallback' | 'db-only';
    engineBuildType: 'multi' | 'single' | 'multi-failed-single-fallback' | 'fallback' | 'db-only';
    fallbackReason: string | null;
    lastEngineError: string | null;
    unavailableMoveUcis: Record<string, boolean>;
    activeFen: string | null;
    generation: number | null;
    staircaseStep: 'none' | 'stabilizing' | 'transitioning' | 'expanded';
    restartReason: RestartReason;
  }>({
    status: 'idle',
    evaluations: {},
    candidateMoves: [],
    errorMessage: null,
    completedFrameDepth: null,
    targetDepth: 20,
    targetCount: 0,
    resolvedCount: 0,
    nodes: 0,
    nps: 0,
    peakNps: 0,
    engineMode: 'stockfish',
    engineBuildType: 'multi',
    fallbackReason: null,
    lastEngineError: null,
    unavailableMoveUcis: {},
    activeFen: null,
    generation: null,
    staircaseStep: 'none',
    restartReason: null
  });

  public getProvisionalEvaluation(): EngineMoveEvaluation | null {
    return this.provisionalEvaluation;
  }

  public setProvisionalEvaluation(evaluation: EngineMoveEvaluation | null) {
    this.provisionalEvaluation = evaluation;
    console.info('[LocalAnalysisStore] provisionalEvaluation 설정됨:', evaluation);
  }

  public setProvisionalSeedEvaluation(evaluation: EngineMoveEvaluation | null) {
    this.provisionalEvaluation = evaluation;
    console.info('[LocalAnalysisStore] setProvisionalSeedEvaluation 설정됨:', evaluation);
  }

  public rememberLastSelectedMoveEvaluation(uci: string) {
    const ev = this.state.evaluations[uci];
    if (ev) {
      this.provisionalEvaluation = ev;
      console.info('[LocalAnalysisStore] rememberLastSelectedMoveEvaluation 저장 성공:', ev);
    } else {
      this.provisionalEvaluation = null;
      console.info('[LocalAnalysisStore] rememberLastSelectedMoveEvaluation 해당 수의 평가를 발견하지 못함:', uci);
    }
  }

  public clearProvisionalEvaluation() {
    this.provisionalEvaluation = null;
  }

  public injectProvisionalEvaluations(candidateMoves: any[]) {
    if (!this.provisionalEvaluation) return;

    const nextEvals: Record<string, EngineMoveEvaluation> = {};
    for (const m of candidateMoves) {
      nextEvals[m.uci] = {
        moveSan: m.san,
        moveUci: m.uci,
        score: this.provisionalEvaluation.score,
        depth: this.provisionalEvaluation.depth,
        source: 'provisional'
      };
    }

    this.state.evaluations = nextEvals;
    this.state.resolvedCount = candidateMoves.length;
    console.info('[LocalAnalysisStore] injectProvisionalEvaluations 주입 완료되었습니다.', nextEvals);
  }

  public get restartReason(): RestartReason {
    return this.state.restartReason;
  }

  public setRestartReason(reason: RestartReason) {
    this.state.restartReason = reason;
    console.info('[LocalAnalysisStore] restartReason 설정됨:', reason);
  }

  /**
   * 실제 구동 중인 엔진 빌드 타입을 반환합니다.
   */
  public get engineBuildType(): 'multi' | 'single' | 'multi-failed-single-fallback' | 'fallback' | 'db-only' {
    return this.state.engineBuildType;
  }

  /**
   * 실제 구동된 엔진의 빌드 타입을 업데이트합니다.
   */
  public setEngineBuildType(type: 'multi' | 'single' | 'multi-failed-single-fallback' | 'fallback' | 'db-only') {
    this.state.engineBuildType = type;
  }

  /**
   * 주엔진 작동 모드 ('stockfish' | 'fallback' | 'db-only')를 쿼리합니다.
   */
  public get engineMode(): 'stockfish' | 'fallback' | 'db-only' {
    return this.state.engineMode;
  }

  /**
   * 폴백 전환 사유 및 상황 설명을 반환합니다.
   */
  public get fallbackReason(): string | null {
    return this.state.fallbackReason;
  }

  /**
   * 엔진 결함이나 초기화 실패 시 최종 수집된 에러 객체 메세지입니다.
   */
  public get lastEngineError(): string | null {
    return this.state.lastEngineError;
  }

  /**
   * 엔진 모드를 명시적으로 지정합니다.
   */
  public setEngineMode(mode: 'stockfish' | 'fallback' | 'db-only') {
    this.state.engineMode = mode;
  }

  /**
   * 폴백 작동 상태와 발생 원인을 구체적으로 조립합니다.
   */
  public setFallbackState(reason: string, errorMsg: string | null = null) {
    this.state.engineMode = 'fallback';
    this.state.fallbackReason = reason;
    if (errorMsg) {
      this.state.lastEngineError = errorMsg;
    }
  }

  /**
   * 로컬 스레드 분석 상태 및 폴백 메타 기록을 소거합니다.
   */
  public clearFallbackState() {
    this.state.engineMode = 'stockfish';
    this.state.fallbackReason = null;
    this.state.lastEngineError = null;
  }

  /**
   * 현재 싱글스레드 계단식(Staircase) 무제한 분석의 세부 단계입니다.
   */
  public get staircaseStep(): 'none' | 'stabilizing' | 'transitioning' | 'expanded' {
    return this.state.staircaseStep;
  }

  /**
   * 계단식 수색 세부 단계를 갱신합니다.
   */
  public setStaircaseStep(step: 'none' | 'stabilizing' | 'transitioning' | 'expanded') {
    this.state.staircaseStep = step;
  }

  /**
   * 로컬 Stockfish 엔진이 한창 백그라운드 연산을 수행 중인지 여부를 쿼리합니다.
   */
  public get isAnalyzing(): boolean {
    return this.state.status === 'analyzing' || this.state.status === 'analyzing-deeper' || this.state.status === 'depth-progress' || this.state.status === 'fallback-running';
  }

  /**
   * 현재 분석 스토어의 구동 상태를 지칭합니다.
   */
  public get status(): AnalysisStatus {
    return this.state.status;
  }

  /**
   * 상태를 명시적으로 최신화합니다.
   */
  public setStatus(status: AnalysisStatus) {
    this.state.status = status;

    if (
      status === 'restarting' || 
      status === 'transitioning' || 
      status === 'waiting-ready'
    ) {
      // 분석 도중 재생성/전이 상태에 속하는 경우, 미평가 후보수들을 일시적으로 '분석 불가' 처리하는 것을 차단합니다.
      return;
    }

    // 만약 실패/종료 터미널 상태 또는 completed 형태로 진입 시, 아직 평가가 누적되지 않은(예: DB 점수가 매칭되지 않은) 후보수 데이터 전체를
    // unavailableMoveUcis에 안정적으로 등록하여 무한 로딩('...')을 원천 차단합니다.
    if (
      status === 'completed' ||
      status === 'fallback-completed' ||
      status === 'analysis-unavailable' ||
      status === 'fallback-disabled' ||
      status === 'fallback-failed' ||
      status === 'stockfish-failed' ||
      status === 'error'
    ) {
      const ucis = this.state.candidateMoves.map(m => m.uci);
      const next = { ...this.state.unavailableMoveUcis };
      for (const uci of ucis) {
        if (!this.state.evaluations[uci]) {
          next[uci] = true;
        }
      }
      this.state.unavailableMoveUcis = next;
    }
  }

  public get isStockfishFailed(): boolean {
    return this.state.status === 'stockfish-failed';
  }

  public get isFallbackRunning(): boolean {
    return this.state.status === 'fallback-running';
  }

  public get isFallbackDisabled(): boolean {
    return this.state.status === 'fallback-disabled';
  }

  public get isFallbackFailed(): boolean {
    return this.state.status === 'fallback-failed';
  }

  public get isAnalysisUnavailable(): boolean {
    return this.state.status === 'analysis-unavailable';
  }

  /**
   * 누적 저장된 FEN 대비 각각의 후보수(LAN/UCI 표현식)별 Stockfish 평가 스코어 매핑 컬렉션을 리턴합니다.
   */
  public get evaluations() {
    return this.state.evaluations;
  }

  /**
   * 현재 분석을 진행하기 위해 전달받은 후보수 원본 리스트입니다.
   */
  public get candidateMoves(): any[] {
    return this.state.candidateMoves;
  }

  /**
   * 분석 엔진 가동 상 발생 가능한 치명 오류 메세지를 탐색합니다.
   */
  public get errorMessage(): string | null {
    return this.state.errorMessage;
  }

  /**
   * 완벽히 모든 MultiPV 조합이 채워진 기준의 탐색 깊이(depth)입니다.
   */
  public get completedFrameDepth(): number | null {
    return this.state.completedFrameDepth;
  }

  /**
   * 최소 타겟 검색 깊이(24)가 완료되었는지 여부
   */
  public get minimumTargetCompleted(): boolean {
    const minDepth = this.state.completedFrameDepth;
    if (minDepth === null) return false;
    return minDepth >= 24;
  }

  /**
   * 전체 타겟 후보수(targetCount)가 모두 targetDepth 이상 분석 완료되었는지 여부를 조회합니다.
   */
  public get isAllMovesAnalyzedToTargetDepth(): boolean {
    if (this.state.targetCount <= 0) return false;
    const evalKeys = Object.keys(this.state.evaluations);
    if (evalKeys.length < this.state.targetCount) return false;
    
    for (const uci of evalKeys) {
      const ev = this.state.evaluations[uci];
      if (!ev || ev.depth < this.state.targetDepth) {
        return false;
      }
    }
    return true;
  }

  /**
   * 분석 목표 수색 깊이(target depth)입니다.
   */
  public get targetDepth(): number {
    return this.state.targetDepth;
  }

  /**
   * 분석을 목표로 삼는 타겟 후보수의 개수 사양입니다.
   */
   public get targetCount(): number {
    return this.state.targetCount;
  }

  /**
   * 실시간 계측 완료된 후보수 수량입니다.
   */
  public get resolvedCount(): number {
    return this.state.resolvedCount;
  }

  /**
   * 실시간 누적/파싱된 Stockfish 탐색 노드 수량입니다.
   */
  public get nodes(): number {
    return this.state.nodes;
  }

  /**
   * 실시간 누적/파싱된 Stockfish 초당 주행 노드 수(NPS 최신값)입니다.
   */
  public get nps(): number {
    return this.state.nps;
  }

  /**
   * 전체 분석 중 기록된 최고 초당 주행 노드 수(Peak NPS)입니다.
   */
  public get peakNps(): number {
    return this.state.peakNps;
  }

  /**
   * 엔진의 최적 수 탐구 프로세스를 개시하며 상태를 'analyzing'으로 갱신하고 스코어 맵을 정화합니다.
   */
  public startAnalysis(candidateMoves: any[] = [], fen?: string, generation?: number, targetDepth?: number) {
    this.state.status = 'analyzing';
    this.state.evaluations = {};
    this.state.candidateMoves = candidateMoves;
    this.state.errorMessage = null;
    this.state.completedFrameDepth = null;
    this.state.targetDepth = targetDepth ?? 20;
    this.state.targetCount = candidateMoves.length;
    this.state.resolvedCount = 0;
    this.state.nodes = 0;
    this.state.nps = 0;
    this.state.peakNps = 0;
    this.state.unavailableMoveUcis = {};
    this.state.restartReason = null;
    if (fen !== undefined) this.state.activeFen = fen;
    if (generation !== undefined) this.state.generation = generation;
    this.state.staircaseStep = 'none';
    this.clearFallbackState();
  }

  /**
   * DB-only 등의 경로에서 연산 진행 없이, 현재 포지션에 해당하는 전체 후보수 수량 및 데이터 목록을
   * 스토어에 보존 등록합니다. 이를 통해 실제 로컬 분석 쓰레드가 돌지 않더라도 전체 기보 상태 및
   * 후보수 총량을 활용하여 분석 완성 여부를 도출할 수 있습니다.
   */
  public setCandidateMovesForPosition(candidateMoves: any[]) {
    this.state.candidateMoves = candidateMoves;
    this.state.targetCount = candidateMoves.length;
  }

  /**
   * 새 포지션/세대 구성을 분석하기 전 분석 상태를 초기화합니다.
   */
  public initAnalysisState(fen: string, generation: number) {
    const isSameGeneration = 
      this.state.activeFen === fen && 
      this.state.generation === generation;

    if (!isSameGeneration) {
      this.state.activeFen = fen;
      this.state.generation = generation;
      this.state.evaluations = {};
      this.state.restartReason = null;

      const isFailedStatus = 
        this.state.status === 'analysis-unavailable' ||
        this.state.status === 'fallback-disabled' ||
        this.state.status === 'fallback-failed' ||
        this.state.status === 'stockfish-failed' ||
        this.state.status === 'error';

      if (!isFailedStatus) {
        this.state.status = 'idle';
        this.state.unavailableMoveUcis = {};
      } else {
        const ucis = this.state.candidateMoves.map(m => m.uci);
        const next: Record<string, boolean> = {};
        for (const uci of ucis) {
          next[uci] = true;
        }
        this.state.unavailableMoveUcis = next;
      }
    }
    
    this.state.errorMessage = null;
  }

  /**
   * 명시적으로 특정 후보수 목록을 분석 불가 상태로 설정합니다.
   */
  public markUnavailableMoves(ucis: string[]) {
    const next = { ...this.state.unavailableMoveUcis };
    for (const uci of ucis) {
      next[uci] = true;
    }
    this.state.unavailableMoveUcis = next;
  }

  /**
   * 모든 특정 후보수 분석 불가 기록을 제거합니다.
   */
  public clearUnavailableMoves() {
    this.state.unavailableMoveUcis = {};
  }

  /**
   * 가동 중인 로컬 백그라운드 연산을 강제 중단 처리하고 상태를 'completed'로 이전합니다.
   */
  public stopAnalysis() {
    if (
      this.state.status === 'fallback-running' ||
      this.state.status === 'fallback-disabled' ||
      this.state.status === 'fallback-failed' ||
      this.state.status === 'analysis-unavailable' ||
      this.state.status === 'stockfish-failed' ||
      this.state.status === 'restarting' ||
      this.state.status === 'transitioning' ||
      this.state.status === 'waiting-ready' ||
      this.state.status === 'error'
    ) {
      return;
    }
    if (this.state.status === 'analyzing' || this.state.status === 'analyzing-deeper' || this.state.status === 'depth-progress') {
      const minDepth = this.state.completedFrameDepth ?? 0;
      if (this.state.targetDepth < 90 && minDepth >= this.state.targetDepth) {
        this.setStatus('completed');
      } else {
        this.setStatus('depth-progress');
      }
    }
  }

  /**
   * 로컬 Stockfish가 UCI Modo 초기화 완료(Ready ok) 상태에 진입했을 때 보고 신호를 수신해 전파합니다.
   */
  public setReady() {
    if (this.state.status === 'idle' || this.state.status === 'ready') {
      this.state.status = 'ready';
    }
    this.state.errorMessage = null;
  }

  /**
   * 백그라운드 연산자 또는 스레드 기동 실패 시 안정적인 예외 복구를 위해 에러 상태를 셋업합니다.
   */
  public setError(reason: string, details: string | null = null) {
    const isTerminalFailedStatus = 
      this.state.status === 'analysis-unavailable' ||
      this.state.status === 'fallback-disabled' ||
      this.state.status === 'fallback-failed' ||
      this.state.status === 'stockfish-failed';

    if (!isTerminalFailedStatus) {
      this.state.status = 'error';
    }
    this.state.errorMessage = reason;
    if (details) {
      this.state.lastEngineError = details;
    }
  }

  /**
   * 엔진 결함 원인을 정밀하고 명시적인 문자열 형태로 직접 저장합니다.
   */
  public setEngineError(err: string | null) {
    this.state.lastEngineError = err;
  }

  /**
   * 멀티스레드 로드 실패 등으로 fallback 전환을 감행할 때, 기존 연산 도중 완료되거나 쌓였던 evaluations를 공중분해시키지 않고 보존하면서,
   * 상태 및 후보수 정보만 새롭게 analyzing으로 재시작할 수 있는 전용 복구용 함수입니다.
   */
  public restartAnalysisPreservingEvaluations(candidateMoves: any[] = [], options?: { preserveFallback?: boolean; targetDepth?: number }) {
    const prevEvals = { ...this.state.evaluations };
    const preservedEvals: Record<string, EngineMoveEvaluation> = {};
    for (const [uci, oldEval] of Object.entries(prevEvals)) {
      if (oldEval && oldEval.depth !== undefined && oldEval.depth >= 10) {
        preservedEvals[uci] = oldEval;
      }
    }
    this.state.status = 'analyzing';
    this.state.evaluations = preservedEvals;
    this.state.candidateMoves = candidateMoves;
    this.state.errorMessage = null;
    this.state.completedFrameDepth = null;
    this.state.targetDepth = options?.targetDepth ?? this.state.targetDepth;
    this.state.targetCount = candidateMoves.length;
    this.state.resolvedCount = Object.keys(preservedEvals).length;
    this.state.nodes = 0;
    this.state.nps = 0;
    this.state.unavailableMoveUcis = {};
    this.state.staircaseStep = 'none';
    
    // fallback 전용 분석이나 지속 도중에는 clear하지 않게 옵션에 따라 처리
    if (!options?.preserveFallback) {
      this.clearFallbackState();
    }
  }

  /**
   * 특정 후보수에 대응하여 정소화된 새로운 평가 스코어(Evaluations)를 점진 누적 및 최신 업데이트합니다.
   */
  public addEvaluationUpdate(update: { moveUci: string; score: any; depth: number; source?: 'db' | 'local' | 'fallback' | 'db-stale'; nodes?: number; nps?: number }) {
    if (update.nodes !== undefined) {
      this.state.nodes = update.nodes;
    }
    if (update.nps !== undefined) {
      this.state.nps = update.nps;
    }
    const prev = this.state.evaluations[update.moveUci];
    if (!prev || (prev.depth <= update.depth)) {
      const matched = this.state.candidateMoves.find(
        m => m.uci.toLowerCase() === update.moveUci.toLowerCase()
      );
      const moveSan = matched ? matched.san : '';

      this.state.evaluations[update.moveUci] = {
        moveSan,
        moveUci: update.moveUci,
        score: update.score,
        depth: update.depth,
        source: update.source || 'local'
      };
    }
    this.state.resolvedCount = Object.keys(this.state.evaluations).length;

    // 점진 수집 환경에서도 completedFrameDepth가 전체 완료 여부의 최소 깊이로 투명하게 동조할 수 있게 강제 제어합니다.
    if (this.state.resolvedCount >= this.state.targetCount) {
      let minDepth = 999;
      for (const ev of Object.values(this.state.evaluations)) {
        if (ev && ev.depth < minDepth) {
          minDepth = ev.depth;
        }
      }
      if (minDepth !== 999) {
        this.state.completedFrameDepth = minDepth;
      }
    }

    if (this.state.status === 'analyzing' || this.state.status === 'depth-progress' || this.state.status === 'analyzing-deeper') {
      const minDepth = this.state.completedFrameDepth ?? update.depth;
      const isInfinite = this.state.targetDepth >= 90;
      const effectiveTargetDepth = this.state.engineMode === 'fallback' ? 10 : this.state.targetDepth;

      if (this.state.resolvedCount >= this.state.targetCount) {
        if (isInfinite) {
          this.setStatus('analyzing-deeper');
        } else if (minDepth >= effectiveTargetDepth) {
          this.setStatus('completed');
        } else if (minDepth >= 24 && this.state.engineMode !== 'fallback') {
          this.setStatus('analyzing-deeper');
        } else {
          this.setStatus('depth-progress');
        }
      }
    }
  }

  /**
   * 완성도 높은 MultiPV 프레임 단위의 모든 기보 평가 요소를 Svelte Reactive 맵 상에 한 번에 반영합니다.
   * 이렇게 함으로써 중간 연산 도중 순위 요동으로 인스턴스 정렬 깜빡임 현상이 연쇄 트리거되는 것을 말끔히 봉인합니다.
   */
  public replaceEvaluationFrame(
    frame: (LocalAnalysisResult | { moveUci?: string; rootMoveUci?: string; bestMoveUci?: string; score: any; depth: number; source?: 'db' | 'local' | 'fallback' | 'db-stale'; nodes?: number; nps?: number })[]
  ) {
    if (frame.length === 0) return;

    const nextEvals: Record<string, EngineMoveEvaluation> = { ...this.state.evaluations };
    let minDepth = 999;
    let maxNodes = this.state.nodes;
    let latestNps = this.state.nps;
    let peakNps = this.state.peakNps;

    for (const item of frame) {
      // rootMoveUci || bestMoveUci || moveUci를 가용 기준 UCI로 변환
      let targetUci = '';
      if ('moveUci' in item && item.moveUci) {
        targetUci = item.moveUci;
      } else if ('rootMoveUci' in item && item.rootMoveUci) {
        targetUci = item.rootMoveUci;
      } else if ('bestMoveUci' in item && item.bestMoveUci) {
        targetUci = item.bestMoveUci;
      }

      if (!targetUci) continue;

      // item.source 타입에 db-stale 등이 포함되어 있다면 해당 도메인 타입과 정확히 밀착 매핑
      // fallback 프레임일 때는 'fallback', 그 외 로컬 연산 프레임은 'local'을 기본값으로 복원
      let itemSource: 'db' | 'local' | 'fallback' | 'db-stale' = 'local';
      if ('source' in item && item.source) {
        itemSource = item.source as 'db' | 'local' | 'fallback' | 'db-stale';
      } else if ('analysisId' in item && item.analysisId === 'fallback') {
        itemSource = 'fallback';
      }

      // 기존 후보수의 분석 심도를 점검하여 역전 혹은 저하 덮어쓰기 무력화 방어
      const prev = nextEvals[targetUci];
      if (prev && prev.depth > item.depth) {
        if (prev.depth < minDepth) {
          minDepth = prev.depth;
        }
        continue;
      }

      const matched = this.state.candidateMoves.find(
        m => m.uci.toLowerCase() === targetUci.toLowerCase()
      );
      const moveSan = matched ? matched.san : ('bestMoveSan' in item && item.bestMoveSan ? item.bestMoveSan : '');

      nextEvals[targetUci] = {
        moveSan,
        moveUci: targetUci,
        score: item.score,
        depth: item.depth,
        source: itemSource
      };

      if (item.depth < minDepth) {
        minDepth = item.depth;
      }
      if ('nodes' in item && item.nodes !== undefined && item.nodes > maxNodes) {
        maxNodes = item.nodes;
      }
      if ('nps' in item && item.nps !== undefined && item.nps > 0) {
        latestNps = item.nps;
        if (item.nps > peakNps) {
          peakNps = item.nps;
        }
      }
    }

    this.state.evaluations = nextEvals;

    // 실제 전체 후보수 기준의 최소 depth가 되도록 보장
    const totalTargets = this.state.candidateMoves.map(m => m.uci.toLowerCase());
    let allExist = totalTargets.length > 0;
    let actualMinDepth = 999;

    for (const uci of totalTargets) {
      const foundKey = Object.keys(nextEvals).find(k => k.toLowerCase() === uci);
      const ev = foundKey ? nextEvals[foundKey] : undefined;
      if (!ev) {
        allExist = false;
        break;
      }
      if (ev.depth < actualMinDepth) {
        actualMinDepth = ev.depth;
      }
    }

    if (allExist && actualMinDepth !== 999) {
      this.state.completedFrameDepth = actualMinDepth;
    } else {
      this.state.completedFrameDepth = null;
    }

    this.state.nodes = maxNodes;
    this.state.nps = latestNps;
    this.state.peakNps = peakNps;
    this.state.resolvedCount = Object.keys(nextEvals).length;

    if (this.state.status === 'analyzing' || this.state.status === 'depth-progress' || this.state.status === 'analyzing-deeper') {
      const completedDepth = this.state.completedFrameDepth;
      const isInfinite = this.state.targetDepth >= 90;
      const effectiveTargetDepth = this.state.engineMode === 'fallback' ? 10 : this.state.targetDepth;

      if (completedDepth !== null) {
        if (isInfinite) {
          this.setStatus('analyzing-deeper');
        } else if (completedDepth >= effectiveTargetDepth) {
          this.setStatus('completed');
        } else if (completedDepth >= 24 && this.state.engineMode !== 'fallback') {
          this.setStatus('analyzing-deeper');
        } else {
          this.setStatus('depth-progress');
        }
      } else if (this.state.resolvedCount >= this.state.targetCount) {
        this.setStatus('depth-progress');
      }
    }
  }

  /**
   * 검색 속도를 지연 없이 지원하기 위해 수의 UCI 코드를 기준으로 캐싱된 평가 결과를 인출해 옵니다.
   */
  public getEvaluationForMove(uci: string): EngineMoveEvaluation | undefined {
    return this.state.evaluations[uci];
  }

  /**
   * 특정 후보수에 한정하여, 아직 평가를 수립할 데이터가 확보되지 않았고 추가적으로 분석 엔진이 구동되어 데이터를 채울 가능성이 없을 때 분석 불가로 판정합니다.
   */
  public isEvaluationUnavailableForMove(uci: string): boolean {
    const hasEval = !!this.state.evaluations[uci];
    if (hasEval) {
      return false;
    }
    if (this.state.unavailableMoveUcis[uci]) {
      return true;
    }
    const s = this.state.status;
    return (
      s === 'analysis-unavailable' ||
      s === 'fallback-disabled' ||
      s === 'fallback-failed' ||
      s === 'stockfish-failed' ||
      s === 'error'
    );
  }
}

export const localAnalysisStore = new LocalAnalysisStore();

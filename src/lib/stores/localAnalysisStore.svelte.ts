import type { EngineMoveEvaluation } from '../domain/analysis/AnalysisTypes';

export type AnalysisStatus = 'idle' | 'ready' | 'analyzing' | 'completed' | 'error';

/**
 * 브라우저 로컬 백그라운드 스레드(Web Worker)에서 기동되는 Stockfish 분석 엔진의 실시간 진행 현황을 관제하는 스토어입니다.
 * 엔진 로딩 상태(준비/분석중/완료/오류), FEN 후보수별 기보 가치 평가 점수(Evaluations)를 관리합니다.
 */
class LocalAnalysisStore {
  private state = $state<{
    status: AnalysisStatus;
    evaluations: Record<string, EngineMoveEvaluation>;
    candidateMoves: any[];
    errorMessage: string | null;
  }>({
    status: 'idle',
    evaluations: {},
    candidateMoves: [],
    errorMessage: null
  });

  /**
   * 로컬 Stockfish 엔진이 한창 백그라운드 연산을 수행 중인지 여부를 쿼리합니다.
   */
  public get isAnalyzing(): boolean {
    return this.state.status === 'analyzing';
  }

  /**
   * 현재 분석 스토어의 구동 상태('idle' | 'ready' | 'analyzing' | 'completed' | 'error')를 지칭합니다.
   */
  public get status(): AnalysisStatus {
    return this.state.status;
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
   * 엔진의 최적 수 탐구 프로세스를 개시하며 상태를 'analyzing'으로 갱신하고 스코어 맵을 정화합니다.
   */
  public startAnalysis(candidateMoves: any[] = []) {
    this.state.status = 'analyzing';
    this.state.evaluations = {};
    this.state.candidateMoves = candidateMoves;
    this.state.errorMessage = null;
  }

  /**
   * 가동 중인 로컬 백그라운드 연산을 강제 중단 처리하고 상태를 'completed'로 이전합니다.
   */
  public stopAnalysis() {
    if (this.state.status === 'analyzing') {
      this.state.status = 'completed';
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
  public setError(reason: string) {
    this.state.status = 'error';
    this.state.errorMessage = reason;
  }

  /**
   * 특정 후보수에 대응하여 정소화된 새로운 평가 스코어(Evaluations)를 점진 누적 및 최신 업데이트합니다.
   */
  public addEvaluationUpdate(update: { moveUci: string; score: any; depth: number }) {
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
        depth: update.depth
      };
    }
  }

  /**
   * 검색 속도를 지연 없이 지원하기 위해 수의 UCI 코드를 기준으로 캐싱된 평가 결과를 인출해 옵니다.
   */
  public getEvaluationForMove(uci: string): EngineMoveEvaluation | undefined {
    return this.state.evaluations[uci];
  }
}

export const localAnalysisStore = new LocalAnalysisStore();

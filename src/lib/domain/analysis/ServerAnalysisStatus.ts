export type ServerStatus = 'disabled' | 'unavailable' | 'pending' | 'ready';

export class ServerAnalysisStatus {
  constructor(
    public readonly status: ServerStatus,
    public readonly progress: number = 0,
    public readonly message: string = '',
    public readonly error: string | null = null
  ) {}

  public static disabled(): ServerAnalysisStatus {
    return new ServerAnalysisStatus('disabled', 0, 'Server analysis is disabled in Open Beta 0.');
  }
}

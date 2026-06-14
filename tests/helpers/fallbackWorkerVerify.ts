import type { Page, Request, Response } from '@playwright/test';

export interface FallbackNetworkDiagnostic {
  ok: boolean;
  reason?: string;
  logs: string[];
}

export class FallbackWorkerMonitor {
  private page: Page;
  public logs: string[] = [];
  public hasBlockedWorker = false;
  public blockedReason?: string;

  constructor(page: Page) {
    this.page = page;

    // Listeners registering
    this.page.on('requestfailed', (request: Request) => {
      const url = request.url();
      if (url.includes('heuristicFallback') || url.includes('worker') || url.includes('?worker')) {
        const failure = request.failure();
        const reason = failure ? failure.errorText : 'Unknown';
        this.logs.push(`[RequestFailed] URL: ${url} | Error: ${reason}`);
        if (reason.includes('ERR_BLOCKED_BY_RESPONSE') || reason.includes('blocked')) {
          this.hasBlockedWorker = true;
          this.blockedReason = `Request failed: ${reason}`;
        }
      }
    });

    this.page.on('response', (response: Response) => {
      const url = response.url();
      if (url.includes('heuristicFallback') || url.includes('worker') || url.includes('?worker')) {
        const status = response.status();
        const headers = response.headers();
        const contentType = headers['content-type'] || 'N/A';
        this.logs.push(`[Response] URL: ${url} | Status: ${status} | Type: ${contentType}`);
        
        if (status >= 400) {
          this.hasBlockedWorker = true;
          this.blockedReason = `HTTP response status ${status}`;
        }
      }
    });
  }

  public checkWorkerBlocked(): FallbackNetworkDiagnostic {
    if (this.hasBlockedWorker) {
      return { ok: false, reason: this.blockedReason || 'Blocked by response', logs: this.logs };
    }
    
    // Check specific requests within logs for common failure patterns
    for (const log of this.logs) {
      if (log.includes('?worker_file&type=module') && log.includes('Status: ') && !log.includes('Status: 200')) {
        const statusMatch = log.match(/Status:\s*(\d+)/);
        const status = statusMatch ? statusMatch[1] : 'Unknown';
        return { 
          ok: false, 
          reason: `Vite worker chunk loading failed with status ${status}: ?worker_file&type=module was blocked or failed`, 
          logs: this.logs 
        };
      }
      if (log.includes('ERR_BLOCKED_BY_RESPONSE') || log.includes('net::ERR_BLOCKED')) {
        return { 
          ok: false, 
          reason: `Strict security COEP/CORP blocking issue identified in request logs: ${log}`, 
          logs: this.logs 
        };
      }
    }
    return { ok: true, logs: this.logs };
  }

  /**
   * 브라우저 내에서 Fallback Worker가 정상 활발히 부팅되어 'fallback-worker-ready' 핸드셰이크를 수립하고,
   * `#engine-panel` 의 모드가 fallback으로 격상 혹은 수행 중인지 대기 검사합니다.
   */
  public async verifyHandshakeReady(timeoutMs: number = 8000): Promise<{ ok: boolean; reason?: string }> {
    try {
      const blockCheck = this.checkWorkerBlocked();
      if (!blockCheck.ok) {
        return { ok: false, reason: `Network-level blocked raw: ${blockCheck.reason}` };
      }

      const result = await this.page.evaluate(async (maxTime) => {
        const startTime = Date.now();
        while (Date.now() - startTime < maxTime) {
          const ep = document.querySelector('#engine-panel');
          if (!ep) {
            await new Promise(r => setTimeout(r, 100));
            continue;
          }
          
          const status = ep.getAttribute('data-status');
          const mode = ep.getAttribute('data-engine-mode');
          const lastErr = ep.getAttribute('data-last-engine-error');

          if (status === 'fallback-running' || mode === 'fallback' || status === 'completed') {
            return { ok: true };
          }
          
          if (status === 'fallback-failed' || status === 'stockfish-failed' || status === 'error') {
            return { ok: false, reason: `Transitioned into failure state: ${status}. Last Error: ${lastErr}` };
          }

          await new Promise(r => setTimeout(r, 100));
        }
        return { ok: false, reason: `Handshake verification timed out after ${maxTime}ms.` };
      }, timeoutMs);

      return result;
    } catch (e: any) {
      return { ok: false, reason: `Exception while checking handshake: ${e.message}` };
    }
  }
}

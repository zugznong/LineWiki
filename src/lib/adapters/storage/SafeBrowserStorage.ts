import { isBrowser } from '../../config/runtimeConfig';

export class SafeBrowserStorage {
  constructor(private readonly type: 'localStorage' | 'sessionStorage') {}

  public getItem(key: string): string | null {
    if (!isBrowser) return null;
    try {
      return window[this.type].getItem(key);
    } catch {
      return null;
    }
  }

  public setItem(key: string, value: string): void {
    if (!isBrowser) return;
    try {
      window[this.type].setItem(key, value);
    } catch (err) {
      console.warn(`Failed to write to browser storage (${this.type}):`, err);
    }
  }

  public removeItem(key: string): void {
    if (!isBrowser) return;
    try {
      window[this.type].removeItem(key);
    } catch {
      // Ignored
    }
  }
}

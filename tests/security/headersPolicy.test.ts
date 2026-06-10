import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Security Headers Policy Test Suite', () => {
  it('should verify correct configuration of static _headers at root, absence of static/_headers, and existence of hooks.server.ts with proper imports', () => {
    // 1. Verify that root _headers exists and holds standard secure policies
    const headersPath = path.resolve('_headers');
    expect(fs.existsSync(headersPath)).toBe(true);

    const content = fs.readFileSync(headersPath, 'utf-8');

    // x-content-type-options
    expect(content).toContain('X-Content-Type-Options: nosniff');

    // x-frame-options DENY
    expect(content).toContain('X-Frame-Options: DENY');

    // csp policy elements
    expect(content).toContain("frame-ancestors 'none'");
    expect(content).toContain("object-src 'none'");
    expect(content).toContain("base-uri 'self'");
    expect(content).toContain("connect-src 'self'");
    expect(content).toContain("img-src 'self' data:");

    // should check there is no unsafe-eval or wildcards
    expect(content).not.toContain('unsafe-eval');
    expect(content).not.toContain('https://ai.studio');
    expect(content).not.toContain('https://*.google.com');

    // 2. Verify that static/_headers config does NOT exist (avoiding duplicate or mislocated builds)
    const staticHeadersPath = path.resolve('static/_headers');
    expect(fs.existsSync(staticHeadersPath)).toBe(false);

    // 3. Verify security config file and dynamic svelte application server hooks
    const configPath = path.resolve('src/lib/security/securityHeaders.ts');
    const hooksPath = path.resolve('src/hooks.server.ts');

    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(hooksPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const hooksContent = fs.readFileSync(hooksPath, 'utf-8');

    // Verify config file contents for key security headers
    expect(configContent).toContain('X-Content-Type-Options');
    expect(configContent).toContain('nosniff');
    expect(configContent).toContain('X-Frame-Options');
    expect(configContent).toContain('DENY');
    expect(configContent).toContain("frame-ancestors 'none'");
    expect(configContent).toContain("object-src 'none'");

    // Verify hooks import the config and handle appropriately
    expect(hooksContent).toContain('handle');
    expect(hooksContent).toContain('SECURITY_HEADERS');
  });
});


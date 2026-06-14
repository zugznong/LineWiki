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
    // Only exact 'unsafe-eval' is blocked; 'wasm-unsafe-eval' is explicitly allowed
    const tokens = content.split(/[\s,;']+/);
    expect(tokens).not.toContain('unsafe-eval');
    expect(content).not.toContain('https://ai.studio');
    expect(content).not.toContain('https://*.google.com');

    // Verify dynamic configuration has same features
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

    // 4. Verification of "Only Report-Only" of Content-Security-Policy (No Enforced Policy Present)
    // Both absolute static _headers and local configTS should not be exposing basic Content-Security-Policy enforced header
    expect(content).not.toContain('\n  Content-Security-Policy:');
    expect(configContent).not.toContain("'Content-Security-Policy':");

    // Both should contain Content-Security-Policy-Report-Only headers
    expect(content).toContain('Content-Security-Policy-Report-Only:');
    expect(configContent).toContain("'Content-Security-Policy-Report-Only':");

    // 5. Check key mandatory directives are present in both static _headers CSP & securityHeaders.ts CSP
    const requiredDirectives = [
      "default-src 'self'",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'"
    ];

    for (const directive of requiredDirectives) {
      expect(content).toContain(directive);
      expect(configContent).toContain(directive);
    }

    // script-src contains self, unsafe-inline, blob: in both
    expect(content).toContain("script-src 'self' 'unsafe-inline' blob:");
    expect(configContent).toContain("script-src 'self' 'unsafe-inline' blob:");

    // 6. Verify COOP & COEP guidelines for Stockfish 18 Multi-thread (SharedArrayBuffer) support
    // Must contain Cross-Origin-Opener-Policy: same-origin
    expect(content).toContain('Cross-Origin-Opener-Policy: same-origin');
    expect(configContent).toContain('Cross-Origin-Opener-Policy');
    expect(configContent).toContain('same-origin');

    // Must contain Cross-Origin-Embedder-Policy: require-corp
    expect(content).toContain('Cross-Origin-Embedder-Policy: require-corp');
    expect(configContent).toContain('Cross-Origin-Embedder-Policy');
    expect(configContent).toContain('require-corp');

    // Verify hooks import the config and handle appropriately
    expect(hooksContent).toContain('handle');
    expect(hooksContent).toContain('SECURITY_HEADERS');
  });

  it('should guarantee absolute COOP/COEP/CORP policy parity across _headers, securityHeaders.ts, and vite.config.ts', () => {
    const headersPath = path.resolve('_headers');
    const configPath = path.resolve('src/lib/security/securityHeaders.ts');
    const viteConfigPath = path.resolve('vite.config.ts');

    expect(fs.existsSync(headersPath)).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(viteConfigPath)).toBe(true);

    const headerText = fs.readFileSync(headersPath, 'utf-8');
    const configText = fs.readFileSync(configPath, 'utf-8');
    const viteConfigText = fs.readFileSync(viteConfigPath, 'utf-8');

    // --- COOP (Cross-Origin-Opener-Policy) parity check ---
    // Rule: Must consistently enforce 'same-origin' across production deployment, runtime hooks and localhost dev servers.
    const expectedCoop = 'same-origin';
    expect(headerText).toContain(`Cross-Origin-Opener-Policy: ${expectedCoop}`);
    expect(configText).toContain(`'Cross-Origin-Opener-Policy': '${expectedCoop}'`);
    expect(viteConfigText).toContain(`'Cross-Origin-Opener-Policy', '${expectedCoop}'`);
    expect(viteConfigText).toContain(`cross-origin-opener-policy') value = '${expectedCoop}'`);

    // --- COEP (Cross-Origin-Embedder-Policy) parity check ---
    // Rule: Must consistently enforce 'require-corp' across production deployment, runtime hooks and localhost dev servers.
    const expectedCoep = 'require-corp';
    expect(headerText).toContain(`Cross-Origin-Embedder-Policy: ${expectedCoep}`);
    expect(configText).toContain(`'Cross-Origin-Embedder-Policy': '${expectedCoep}'`);
    expect(viteConfigText).toContain(`'Cross-Origin-Embedder-Policy', '${expectedCoep}'`);
    expect(viteConfigText).toContain(`cross-origin-embedder-policy') value = '${expectedCoep}'`);

    // --- CORP (Cross-Origin-Resource-Policy) parity check ---
    // Rule: Must consistently enforce 'same-origin' across production deployment, runtime hooks and localhost dev servers.
    const expectedCorp = 'same-origin';
    expect(headerText).toContain(`Cross-Origin-Resource-Policy: ${expectedCorp}`);
    expect(configText).toContain(`'Cross-Origin-Resource-Policy': '${expectedCorp}'`);
    expect(viteConfigText).toContain(`'Cross-Origin-Resource-Policy', '${expectedCorp}'`);
    expect(viteConfigText).toContain(`cross-origin-resource-policy') value = '${expectedCorp}'`);

    // --- X-Content-Type-Options parity check ---
    const expectedNosniff = 'nosniff';
    expect(headerText).toContain(`X-Content-Type-Options: ${expectedNosniff}`);
    expect(configText).toContain(`'X-Content-Type-Options': '${expectedNosniff}'`);
    expect(viteConfigText).toContain(`'X-Content-Type-Options', '${expectedNosniff}'`);
    expect(viteConfigText).toContain(`x-content-type-options') value = '${expectedNosniff}'`);
  });
});


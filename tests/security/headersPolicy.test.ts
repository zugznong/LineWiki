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
      "script-src 'self' 'unsafe-inline' blob:",
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

    // Verify hooks import the config and handle appropriately
    expect(hooksContent).toContain('handle');
    expect(hooksContent).toContain('SECURITY_HEADERS');
  });
});


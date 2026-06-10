import { describe, it, expect } from 'vitest';
import { isSafeInternalPath } from '../../src/lib/utils/url';

describe('isSafeInternalPath', () => {
  it('accepts internal absolute paths', () => {
    expect(isSafeInternalPath('/')).toBe(true);
    expect(isSafeInternalPath('/privacy')).toBe(true);
    expect(isSafeInternalPath('/fen/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1')).toBe(true);
    expect(isSafeInternalPath('/fen/abc?x=1#frag')).toBe(true);
  });

  it('rejects absolute external URLs', () => {
    expect(isSafeInternalPath('https://example.com')).toBe(false);
    expect(isSafeInternalPath('http://evil.test/path')).toBe(false);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeInternalPath('//example.com')).toBe(false);
    expect(isSafeInternalPath('//example.com/fen/abc')).toBe(false);
  });

  it('rejects dangerous schemes', () => {
    expect(isSafeInternalPath('javascript:alert(1)')).toBe(false);
    expect(isSafeInternalPath('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects backslash tricks and control characters', () => {
    expect(isSafeInternalPath('/\\example.com')).toBe(false);
    expect(isSafeInternalPath('/fen\nmalicious')).toBe(false);
    expect(isSafeInternalPath('/fen\x00')).toBe(false);
  });

  it('rejects empty / non-string input', () => {
    expect(isSafeInternalPath('')).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(123)).toBe(false);
    expect(isSafeInternalPath('fen/relative')).toBe(false);
  });
  it('rejects control characters inside paths', () => {
    expect(isSafeInternalPath('/fen/abc\u0000def')).toBe(false);
    expect(isSafeInternalPath('/privacy\nhttps://evil.test')).toBe(false);
  });
});

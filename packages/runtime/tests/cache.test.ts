import { describe, it, expect, beforeEach, vi } from 'vitest';
import { secretsCache } from '../src/cache.js';

describe('secretsCache', () => {
  beforeEach(() => {
    secretsCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve secrets', () => {
    const secrets = { API_KEY: 'test' };
    secretsCache.set('proj', 'config', secrets);

    const retrieved = secretsCache.get('proj', 'config');
    expect(retrieved).toEqual(secrets);
  });

  it('should return null for missing entries', () => {
    const result = secretsCache.get('missing', 'config');
    expect(result).toBeNull();
  });

  it('should expire entries after TTL', () => {
    const secrets = { API_KEY: 'test' };
    secretsCache.set('proj', 'config', secrets, 60); // 60 second TTL

    // Before expiry
    expect(secretsCache.get('proj', 'config')).toEqual(secrets);

    // After expiry
    vi.advanceTimersByTime(61 * 1000);
    expect(secretsCache.get('proj', 'config')).toBeNull();
  });

  it('should track staleness', () => {
    const secrets = { API_KEY: 'test' };
    secretsCache.set('proj', 'config', secrets, 60);

    expect(secretsCache.isStale('proj', 'config')).toBe(false);

    vi.advanceTimersByTime(61 * 1000);
    expect(secretsCache.isStale('proj', 'config')).toBe(true);
  });

  it('should return stale entries for fallback', () => {
    const secrets = { API_KEY: 'test' };
    secretsCache.set('proj', 'config', secrets, 60);

    vi.advanceTimersByTime(61 * 1000);

    // get() returns null (expired)
    expect(secretsCache.get('proj', 'config')).toBeNull();
    // getStale() returns the entry anyway
    expect(secretsCache.getStale('proj', 'config')).toEqual(secrets);
  });

  it('should track refreshing state', () => {
    const secrets = { API_KEY: 'test' };
    secretsCache.set('proj', 'config', secrets);

    expect(secretsCache.isRefreshing('proj', 'config')).toBe(false);

    secretsCache.setRefreshing('proj', 'config', true);
    expect(secretsCache.isRefreshing('proj', 'config')).toBe(true);

    secretsCache.setRefreshing('proj', 'config', false);
    expect(secretsCache.isRefreshing('proj', 'config')).toBe(false);
  });

  it('should delete specific entries', () => {
    secretsCache.set('proj1', 'config', { A: '1' });
    secretsCache.set('proj2', 'config', { B: '2' });

    secretsCache.delete('proj1', 'config');

    expect(secretsCache.get('proj1', 'config')).toBeNull();
    expect(secretsCache.get('proj2', 'config')).toEqual({ B: '2' });
  });

  it('should clear all entries', () => {
    secretsCache.set('proj1', 'config', { A: '1' });
    secretsCache.set('proj2', 'config', { B: '2' });

    secretsCache.clear();

    expect(secretsCache.get('proj1', 'config')).toBeNull();
    expect(secretsCache.get('proj2', 'config')).toBeNull();
  });
});

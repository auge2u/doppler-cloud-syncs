import type { Secrets, CacheEntry } from './types.js';

/**
 * Simple in-memory cache for secrets
 * Handles TTL expiration and background refresh
 */
class SecretsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtl: number = 300; // 5 minutes

  /**
   * Generate cache key from config
   */
  private getKey(project: string, config: string): string {
    return `${project}:${config}`;
  }

  /**
   * Get cached secrets if valid
   */
  get(project: string, config: string): Secrets | null {
    const key = this.getKey(project, config);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.secrets;
  }

  /**
   * Set secrets in cache with TTL
   */
  set(project: string, config: string, secrets: Secrets, ttlSeconds?: number): void {
    const key = this.getKey(project, config);
    const ttl = ttlSeconds ?? this.defaultTtl;

    this.cache.set(key, {
      secrets,
      expiresAt: Date.now() + ttl * 1000,
      refreshing: false,
    });
  }

  /**
   * Check if entry is stale (past TTL but still usable)
   */
  isStale(project: string, config: string): boolean {
    const key = this.getKey(project, config);
    const entry = this.cache.get(key);

    if (!entry) {
      return true;
    }

    return Date.now() > entry.expiresAt;
  }

  /**
   * Mark entry as currently refreshing (to prevent duplicate fetches)
   */
  setRefreshing(project: string, config: string, refreshing: boolean): void {
    const key = this.getKey(project, config);
    const entry = this.cache.get(key);

    if (entry) {
      entry.refreshing = refreshing;
    }
  }

  /**
   * Check if entry is currently being refreshed
   */
  isRefreshing(project: string, config: string): boolean {
    const key = this.getKey(project, config);
    const entry = this.cache.get(key);
    return entry?.refreshing ?? false;
  }

  /**
   * Get stale entry (expired but available for fallback)
   */
  getStale(project: string, config: string): Secrets | null {
    const key = this.getKey(project, config);
    const entry = this.cache.get(key);
    return entry?.secrets ?? null;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear specific entry
   */
  delete(project: string, config: string): void {
    const key = this.getKey(project, config);
    this.cache.delete(key);
  }
}

// Singleton instance
export const secretsCache = new SecretsCache();

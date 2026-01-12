// Cache Manager for Terminal Commands

interface CacheEntry {
  data: unknown;
  timestamp: number;
  type: string;
}

// TTLs in seconds
const CACHE_TTLS: Record<string, number> = {
  campaigns: 3600,      // 1 hour
  analytics: 1800,      // 30 min
  accounts: 900,        // 15 min
  dailyAnalytics: 1800, // 30 min
  daily: 1800,          // 30 min
  weekly: 1800,         // 30 min
};

class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();

  getCacheKey(endpoint: string, params?: Record<string, unknown>): string {
    const dateKey = new Date().toISOString().split('T')[0]; // Include date
    return `${endpoint}:${dateKey}:${JSON.stringify(params || {})}`;
  }

  get<T>(key: string, type: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const ttl = (CACHE_TTLS[type] || 1800) * 1000;

    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set(key: string, data: unknown, type: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      type,
    });
  }

  getAge(key: string): string {
    const cached = this.cache.get(key);
    if (!cached) return 'unknown';

    const ageMs = Date.now() - cached.timestamp;
    const ageMin = Math.floor(ageMs / 60000);

    if (ageMin < 1) return 'just now';
    if (ageMin === 1) return '1 minute ago';
    return `${ageMin} minutes ago`;
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  has(key: string, type: string): boolean {
    return this.get(key, type) !== null;
  }
}

// Singleton instance
export const terminalCache = new CacheManager();

// Rate limiter
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 3600000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  checkLimit(): { allowed: boolean; waitTime?: number; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old requests
    this.requests = this.requests.filter(t => t > windowStart);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      return {
        allowed: false,
        waitTime: Math.ceil(waitTime / 60000),
        remaining: 0,
      };
    }

    this.requests.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - this.requests.length,
    };
  }

  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const recent = this.requests.filter(t => t > windowStart);
    return this.maxRequests - recent.length;
  }
}

export const rateLimiter = new RateLimiter(100, 3600000); // 100 requests per hour

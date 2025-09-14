/**
 * 메모리 기반 캐싱 시스템
 * API 호출 최소화 및 성능 최적화를 위한 캐시 관리
 */

class EventCache {
  constructor(ttl = 5 * 60 * 1000) { // 기본 5분 TTL
    this.cache = new Map()
    this.ttl = ttl
    this.maxSize = 100 // 최대 캐시 항목 수
  }
  
  /**
   * 캐시에 데이터 저장
   * @param {string} key - 캐시 키
   * @param {any} data - 저장할 데이터
   * @param {number} customTtl - 커스텀 TTL (밀리초)
   */
  set(key, data, customTtl = null) {
    // 캐시 크기 제한 확인
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.ttl
    })
  }
  
  /**
   * 캐시에서 데이터 조회
   * @param {string} key - 캐시 키
   * @returns {any|null} - 캐시된 데이터 또는 null
   */
  get(key) {
    const item = this.cache.get(key)
    if (!item) {
      // 성능 모니터링을 위한 캐시 미스 카운트
      if (typeof window !== 'undefined' && window.performanceMonitor) {
        window.performanceMonitor.incrementCacheMisses()
      }
      return null
    }
    
    // TTL 확인
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      if (typeof window !== 'undefined' && window.performanceMonitor) {
        window.performanceMonitor.incrementCacheMisses()
      }
      return null
    }
    
    // 성능 모니터링을 위한 캐시 히트 카운트
    if (typeof window !== 'undefined' && window.performanceMonitor) {
      window.performanceMonitor.incrementCacheHits()
    }
    
    return item.data
  }
  
  /**
   * 캐시 무효화
   * @param {string} key - 무효화할 캐시 키 (선택사항)
   */
  invalidate(key = null) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
  
  /**
   * 만료된 캐시 항목 정리
   */
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
  
  /**
   * 캐시 상태 정보
   * @returns {object} - 캐시 통계
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 전역 캐시 인스턴스
export const eventCache = new EventCache()

// 캐시 키 상수
export const CACHE_KEYS = {
  EVENTS: 'events',
  EVENT_STATS: 'event_stats',
  EVENT_DETAIL: 'event_detail'
}

/**
 * 캐시된 데이터 조회 또는 API 호출
 * @param {string} key - 캐시 키
 * @param {Function} apiCall - API 호출 함수
 * @param {number} ttl - TTL (밀리초)
 * @returns {Promise<any>} - 캐시된 데이터 또는 API 응답
 */
export async function getCachedData(key, apiCall, ttl = null) {
  // 캐시에서 먼저 확인
  const cached = eventCache.get(key)
  if (cached) {
    console.log(`Cache hit: ${key}`)
    return cached
  }
  
  // 캐시에 없으면 API 호출
  console.log(`Cache miss: ${key}, calling API`)
  try {
    const data = await apiCall()
    eventCache.set(key, data, ttl)
    return data
  } catch (error) {
    console.error(`API call failed for ${key}:`, error)
    throw error
  }
}

/**
 * 특정 패턴의 캐시 무효화
 * @param {string} pattern - 무효화할 패턴
 */
export function invalidateCachePattern(pattern) {
  const stats = eventCache.getStats()
  const keysToInvalidate = stats.keys.filter(key => key.includes(pattern))
  
  keysToInvalidate.forEach(key => {
    eventCache.invalidate(key)
  })
  
  console.log(`Invalidated ${keysToInvalidate.length} cache entries matching pattern: ${pattern}`)
}

/**
 * 캐시 성능 모니터링
 */
export function getCachePerformance() {
  const stats = eventCache.getStats()
  return {
    ...stats,
    hitRate: stats.hitCount / (stats.hitCount + stats.missCount) || 0,
    memoryUsage: JSON.stringify(stats).length
  }
}

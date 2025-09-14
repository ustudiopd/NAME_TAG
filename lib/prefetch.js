/**
 * 데이터 프리페칭 및 백그라운드 업데이트 시스템
 * 사용자 행동 예측 및 성능 최적화
 */

import { getAllEventsWithStats, getEventById } from './eventDatabase'
import { eventCache, CACHE_KEYS } from './cache'

class PrefetchManager {
  constructor() {
    this.prefetchQueue = new Set()
    this.isPrefetching = false
    this.prefetchDelay = 1000 // 1초 지연
  }

  /**
   * 행사 목록 프리페칭
   */
  async prefetchEvents() {
    if (this.prefetchQueue.has('events')) return
    
    this.prefetchQueue.add('events')
    
    try {
      await getAllEventsWithStats()
      console.log('Events prefetched successfully')
    } catch (error) {
      console.error('Failed to prefetch events:', error)
    } finally {
      this.prefetchQueue.delete('events')
    }
  }

  /**
   * 특정 행사 상세 정보 프리페칭
   * @param {string} eventId - 행사 ID
   */
  async prefetchEventDetail(eventId) {
    const cacheKey = `event_detail_${eventId}`
    if (this.prefetchQueue.has(cacheKey)) return
    
    this.prefetchQueue.add(cacheKey)
    
    try {
      await getEventById(eventId)
      console.log(`Event detail prefetched: ${eventId}`)
    } catch (error) {
      console.error(`Failed to prefetch event detail ${eventId}:`, error)
    } finally {
      this.prefetchQueue.delete(cacheKey)
    }
  }

  /**
   * 지연된 프리페칭 (사용자 상호작용 후)
   * @param {Function} prefetchFn - 프리페칭 함수
   * @param {number} delay - 지연 시간 (밀리초)
   */
  schedulePrefetch(prefetchFn, delay = this.prefetchDelay) {
    if (this.isPrefetching) return
    
    this.isPrefetching = true
    
    setTimeout(async () => {
      try {
        await prefetchFn()
      } catch (error) {
        console.error('Scheduled prefetch failed:', error)
      } finally {
        this.isPrefetching = false
      }
    }, delay)
  }

  /**
   * 백그라운드 캐시 갱신
   */
  async backgroundRefresh() {
    try {
      // 만료된 캐시 정리
      eventCache.cleanup()
      
      // 행사 목록 백그라운드 갱신
      await this.prefetchEvents()
      
      console.log('Background refresh completed')
    } catch (error) {
      console.error('Background refresh failed:', error)
    }
  }

  /**
   * 사용자 행동 기반 프리페칭
   * @param {string} action - 사용자 행동 ('hover', 'focus', 'click')
   * @param {object} data - 관련 데이터
   */
  handleUserAction(action, data) {
    switch (action) {
      case 'hover':
        // 행사 카드 호버 시 상세 정보 프리페칭
        if (data.eventId) {
          this.schedulePrefetch(() => this.prefetchEventDetail(data.eventId), 500)
        }
        break
        
      case 'focus':
        // 포커스 시 관련 데이터 프리페칭
        if (data.eventId) {
          this.schedulePrefetch(() => this.prefetchEventDetail(data.eventId), 300)
        }
        break
        
      case 'click':
        // 클릭 시 즉시 프리페칭
        if (data.eventId) {
          this.prefetchEventDetail(data.eventId)
        }
        break
        
      default:
        break
    }
  }

  /**
   * 프리페칭 통계
   */
  getStats() {
    return {
      queueSize: this.prefetchQueue.size,
      isPrefetching: this.isPrefetching,
      queuedItems: Array.from(this.prefetchQueue)
    }
  }
}

// 전역 프리페치 매니저 인스턴스
export const prefetchManager = new PrefetchManager()

/**
 * 페이지 로드 시 초기 프리페칭
 */
export function initializePrefetch() {
  // 페이지 로드 후 2초 뒤에 행사 목록 프리페칭
  setTimeout(() => {
    prefetchManager.prefetchEvents()
  }, 2000)
  
  // 5분마다 백그라운드 갱신
  setInterval(() => {
    prefetchManager.backgroundRefresh()
  }, 5 * 60 * 1000)
}

/**
 * 사용자 상호작용 핸들러
 */
export function handleUserInteraction(action, data) {
  prefetchManager.handleUserAction(action, data)
}

/**
 * 컴포넌트에서 사용할 프리페칭 훅
 */
export function usePrefetch() {
  return {
    prefetchEvents: () => prefetchManager.prefetchEvents(),
    prefetchEventDetail: (eventId) => prefetchManager.prefetchEventDetail(eventId),
    handleHover: (eventId) => handleUserInteraction('hover', { eventId }),
    handleFocus: (eventId) => handleUserInteraction('focus', { eventId }),
    handleClick: (eventId) => handleUserInteraction('click', { eventId })
  }
}

/**
 * 성능 모니터링
 */
export function getPrefetchPerformance() {
  return {
    prefetch: prefetchManager.getStats(),
    cache: eventCache.getStats()
  }
}

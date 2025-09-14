/**
 * 성능 모니터링 및 측정 도구
 * 로딩 시간, 캐시 히트율, API 호출 수 등을 추적
 */

import { eventCache } from './cache'
import { prefetchManager } from './prefetch'

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      apiCallCount: 0,
      cacheHitCount: 0,
      cacheMissCount: 0,
      renderTime: 0,
      userInteractions: 0
    }
    
    this.startTimes = new Map()
    this.observers = new Map()
  }

  /**
   * 페이지 로드 시간 측정 시작
   */
  startPageLoad() {
    this.startTimes.set('pageLoad', performance.now())
  }

  /**
   * 페이지 로드 시간 측정 완료
   */
  endPageLoad() {
    const startTime = this.startTimes.get('pageLoad')
    if (startTime) {
      this.metrics.pageLoadTime = performance.now() - startTime
      this.startTimes.delete('pageLoad')
    }
  }

  /**
   * API 호출 카운트 증가
   */
  incrementApiCalls() {
    this.metrics.apiCallCount++
  }

  /**
   * 캐시 히트 카운트 증가
   */
  incrementCacheHits() {
    this.metrics.cacheHitCount++
  }

  /**
   * 캐시 미스 카운트 증가
   */
  incrementCacheMisses() {
    this.metrics.cacheMissCount++
  }

  /**
   * 렌더링 시간 측정 시작
   */
  startRender(componentName) {
    this.startTimes.set(`render_${componentName}`, performance.now())
  }

  /**
   * 렌더링 시간 측정 완료
   */
  endRender(componentName) {
    const startTime = this.startTimes.get(`render_${componentName}`)
    if (startTime) {
      const renderTime = performance.now() - startTime
      this.metrics.renderTime += renderTime
      this.startTimes.delete(`render_${componentName}`)
      
      console.log(`${componentName} 렌더링 시간: ${renderTime.toFixed(2)}ms`)
    }
  }

  /**
   * 사용자 상호작용 카운트 증가
   */
  incrementUserInteractions() {
    this.metrics.userInteractions++
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics() {
    const cacheStats = eventCache.getStats()
    const prefetchStats = prefetchManager.getStats()
    
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHitCount / 
        (this.metrics.cacheHitCount + this.metrics.cacheMissCount) || 0,
      cacheStats,
      prefetchStats,
      memoryUsage: this.getMemoryUsage()
    }
  }

  /**
   * 메모리 사용량 조회
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      }
    }
    return null
  }

  /**
   * 성능 리포트 생성
   */
  generateReport() {
    const metrics = this.getMetrics()
    
    const report = {
      timestamp: new Date().toISOString(),
      performance: {
        pageLoadTime: `${metrics.pageLoadTime.toFixed(2)}ms`,
        renderTime: `${metrics.renderTime.toFixed(2)}ms`,
        apiCalls: metrics.apiCallCount,
        cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
        userInteractions: metrics.userInteractions
      },
      cache: {
        size: metrics.cacheStats.size,
        maxSize: metrics.cacheStats.maxSize,
        hitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`
      },
      prefetch: {
        queueSize: metrics.prefetchStats.queueSize,
        isPrefetching: metrics.prefetchStats.isPrefetching
      },
      memory: metrics.memoryUsage
    }

    console.log('=== 성능 리포트 ===')
    console.table(report.performance)
    console.table(report.cache)
    console.table(report.prefetch)
    
    if (report.memory) {
      console.table(report.memory)
    }

    return report
  }

  /**
   * 성능 임계값 체크
   */
  checkThresholds() {
    const metrics = this.getMetrics()
    const warnings = []

    if (metrics.pageLoadTime > 3000) {
      warnings.push(`페이지 로드 시간이 느립니다: ${metrics.pageLoadTime.toFixed(2)}ms`)
    }

    if (metrics.cacheHitRate < 0.5) {
      warnings.push(`캐시 히트율이 낮습니다: ${(metrics.cacheHitRate * 100).toFixed(1)}%`)
    }

    if (metrics.apiCallCount > 10) {
      warnings.push(`API 호출이 많습니다: ${metrics.apiCallCount}회`)
    }

    if (metrics.memoryUsage && metrics.memoryUsage.used > 50) {
      warnings.push(`메모리 사용량이 높습니다: ${metrics.memoryUsage.used}MB`)
    }

    if (warnings.length > 0) {
      console.warn('성능 경고:', warnings)
    }

    return warnings
  }

  /**
   * 성능 데이터 리셋
   */
  reset() {
    this.metrics = {
      pageLoadTime: 0,
      apiCallCount: 0,
      cacheHitCount: 0,
      cacheMissCount: 0,
      renderTime: 0,
      userInteractions: 0
    }
    this.startTimes.clear()
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor()

/**
 * React 컴포넌트에서 사용할 성능 측정 훅
 */
export function usePerformanceMonitor(componentName) {
  const startRender = () => performanceMonitor.startRender(componentName)
  const endRender = () => performanceMonitor.endRender(componentName)
  const incrementInteractions = () => performanceMonitor.incrementUserInteractions()

  return {
    startRender,
    endRender,
    incrementInteractions
  }
}

/**
 * API 호출 래퍼 (자동 카운팅)
 */
export function withPerformanceTracking(apiFunction) {
  return async (...args) => {
    performanceMonitor.incrementApiCalls()
    const startTime = performance.now()
    
    try {
      const result = await apiFunction(...args)
      const duration = performance.now() - startTime
      console.log(`API 호출 완료: ${apiFunction.name} (${duration.toFixed(2)}ms)`)
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      console.error(`API 호출 실패: ${apiFunction.name} (${duration.toFixed(2)}ms)`, error)
      throw error
    }
  }
}

/**
 * 개발 환경에서 성능 모니터링 활성화
 */
export function enablePerformanceMonitoring() {
  if (process.env.NODE_ENV === 'development') {
    // 페이지 로드 시간 측정
    window.addEventListener('load', () => {
      performanceMonitor.endPageLoad()
    })

    // 5초마다 성능 체크
    setInterval(() => {
      performanceMonitor.checkThresholds()
    }, 5000)

    // 30초마다 성능 리포트
    setInterval(() => {
      performanceMonitor.generateReport()
    }, 30000)

    console.log('성능 모니터링이 활성화되었습니다.')
  }
}

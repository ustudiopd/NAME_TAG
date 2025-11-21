/**
 * useFabricCanvas
 * <canvas> 엘리먼트와 Fabric.js 바인딩을 위한 기본 훅
 */

import { useRef, useEffect, useState } from 'react'

/**
 * @param {HTMLCanvasElement|null} canvasElement
 * @returns {Object} { canvasRef, isReady }
 */
export function useFabricCanvas(canvasElement) {
  const canvasRef = useRef(canvasElement)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (canvasElement) {
      canvasRef.current = canvasElement
      setIsReady(true)
    } else {
      setIsReady(false)
    }
  }, [canvasElement])

  return {
    canvasRef,
    isReady
  }
}


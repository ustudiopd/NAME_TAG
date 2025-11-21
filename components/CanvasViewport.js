/**
 * CanvasViewport
 * 캔버스만 렌더링하는 순수 UI 컴포넌트
 * 실제 로직은 EditorCore에서 처리
 */

'use client'

import { useEffect, useRef } from 'react'

/**
 * @param {Object} props
 * @param {Object} props.editor - useNamecardEditor 훅의 반환값
 * @param {Function} [props.onBackgroundImage] - 배경 이미지 업로드 핸들러
 */
export default function CanvasViewport({ editor, onBackgroundImage }) {
  const canvasElementRef = useRef(null)

  // canvasRef를 editor에 연결 (canvasElementRef가 준비되면)
  useEffect(() => {
    if (canvasElementRef.current && editor?.canvasRef) {
      editor.canvasRef.current = canvasElementRef.current
      console.log('CanvasViewport: canvasRef connected to editor', canvasElementRef.current)
      // canvasRef가 설정되었음을 알리기 위해 강제 업데이트
      // (useNamecardEditor의 useEffect가 canvasRef.current 변경을 감지하도록)
    } else {
      if (!canvasElementRef.current) {
        console.log('CanvasViewport: canvasElementRef not ready yet')
      }
      if (!editor?.canvasRef) {
        console.log('CanvasViewport: editor.canvasRef not ready yet')
      }
    }
  }, [canvasElementRef.current, editor?.canvasRef])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">에디터 초기화 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* 툴바 */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">명찰 편집</h3>
        <div className="space-x-2">
          {onBackgroundImage && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Background image button clicked in CanvasViewport')
                onBackgroundImage()
              }}
              className="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors"
            >
              배경 이미지
            </button>
          )}
          <button
            onClick={() => editor.commands.toggleGuidelines()}
            className={`px-3 py-2 text-sm rounded ${
              editor.state.paperSettings?.showGuidelines
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            가이드라인 {editor.state.paperSettings?.showGuidelines ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 캔버스 컨테이너 */}
      <div 
        className="border-2 border-gray-300 rounded-lg relative flex justify-center bg-gray-50"
        style={{
          height: '500px',
          minHeight: '472px',
          position: 'relative',
          overflow: 'visible'
        }}
      >
        <div 
          id="fabric-canvas-container"
          style={{
            position: 'relative',
            width: '340px',
            height: '472px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            margin: '0 auto'
          }}
        >
          <canvas
            ref={canvasElementRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%'
            }}
            onContextMenu={(e) => e.preventDefault()} // 기본 우클릭 메뉴 비활성화
          />
        </div>

        {/* 로딩 상태 */}
        {!editor.state.canvasReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div className="text-sm text-gray-600">캔버스 로딩 중...</div>
            </div>
          </div>
        )}

        {/* 저장 중 상태 */}
        {editor.state.isSaving && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded text-xs">
            저장 중...
          </div>
        )}

        {/* 변경사항 표시 */}
        {editor.state.isDirty && !editor.state.isSaving && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded text-xs">
            변경됨
          </div>
        )}
      </div>
    </div>
  )
}


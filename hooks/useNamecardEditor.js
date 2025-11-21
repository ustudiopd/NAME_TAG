/**
 * useNamecardEditor
 * 명찰 에디터를 위한 메인 React 훅
 * EditorCore를 감싸서 React 상태로 노출
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { EditorCore } from '../lib/editor/EditorCore'
import { getEventLayout, saveEventLayout } from '../lib/repositories/EventLayoutRepository'
import { getDefaultTemplate } from '../lib/repositories/TemplateRepository'
import { getLatestSnapshot, createAutosaveSnapshot } from '../lib/repositories/SnapshotRepository'

/**
 * @param {string} eventId
 * @param {Object} options
 * @returns {Object} { canvasRef, state, commands }
 */
export function useNamecardEditor(eventId, options = {}) {
  const {
    paperWidthCm = 9.0,
    paperHeightCm = 12.5,
    showGuidelines = true
  } = options

  const canvasRef = useRef(null)
  const editorCoreRef = useRef(null)
  const [state, setState] = useState({
    canvasReady: false,
    selectedObjectId: undefined,
    selectedObjectProps: undefined,
    currentProfileId: undefined,
    isDirty: false,
    isSaving: false,
    paperSettings: {
      widthCm: paperWidthCm,
      heightCm: paperHeightCm,
      showGuidelines
    }
  })

  // 이벤트 레이아웃 로드 헬퍼 함수
  const loadEventLayout = useCallback(async (eventId, core) => {
    try {
      console.log('Loading event layout for eventId:', eventId)
      
      // 1. EventLayout 시도
      const eventLayout = await getEventLayout(eventId)
      console.log('EventLayout result:', eventLayout ? 'found' : 'not found')
      if (eventLayout && eventLayout.canvasJson) {
        console.log('Loading event layout from EventLayout')
        await core.loadEventLayout(eventLayout.canvasJson)
        return
      }

      // 2. 없으면 기본 템플릿 로드
      const defaultTemplate = await getDefaultTemplate()
      console.log('DefaultTemplate result:', defaultTemplate ? 'found' : 'not found')
      if (defaultTemplate && defaultTemplate.canvasJson) {
        console.log('Loading template from DefaultTemplate, canvasJson:', defaultTemplate.canvasJson)
        // canvas_json이 빈 객체이거나 유효하지 않으면 기본 템플릿 생성
        if (typeof defaultTemplate.canvasJson === 'object' && 
            defaultTemplate.canvasJson !== null &&
            (defaultTemplate.canvasJson.objects || defaultTemplate.canvasJson.version)) {
          await core.loadTemplate(defaultTemplate.canvasJson)
          return
        } else {
          console.warn('DefaultTemplate canvas_json is invalid, creating default template')
        }
      }

      // 3. 자동저장 스냅샷이 있으면 복원할지 결정 (옵션)
      const latestSnapshot = await getLatestSnapshot(eventId, 'autosave')
      console.log('LatestSnapshot result:', latestSnapshot ? 'found' : 'not found')
      if (latestSnapshot && latestSnapshot.canvasJson) {
        // 사용자에게 물어볼 수도 있음
        // 지금은 자동으로 복원하지 않음
        // await core.loadEventLayout(latestSnapshot.canvasJson)
      }

      // 4. 아무것도 없으면 기본 템플릿 생성
      console.log('Creating default template (no layout/template/snapshot found)')
      if (core.canvas && core.fabric) {
        core.createDefaultTemplate()
        console.log('Default template created')
      } else {
        console.error('Cannot create default template: canvas or fabric not ready')
      }
    } catch (error) {
      console.error('Failed to load event layout:', error)
      // 에러가 발생해도 기본 템플릿 생성 시도
      if (core.canvas && core.fabric) {
        console.log('Attempting to create default template after error')
        core.createDefaultTemplate()
      }
    }
  }, [])

  // EditorCore 초기화 (canvasRef가 준비될 때까지 대기)
  useEffect(() => {
    if (!eventId) return

    let isMounted = true
    let core = null
    let unsubscribe = null
    let initAttempted = false

      // canvasRef가 준비될 때까지 대기
      const checkCanvasReady = async () => {
        if (!canvasRef.current) {
          console.log('useNamecardEditor: canvasRef not ready, retrying...')
          setTimeout(checkCanvasReady, 100)
          return
        }

        if (!isMounted || initAttempted) {
          if (initAttempted) {
            console.log('useNamecardEditor: initialization already attempted, skipping')
          }
          return
        }
        initAttempted = true
        console.log('useNamecardEditor: canvasRef ready, initializing EditorCore...')

      const config = {
        canvasElement: canvasRef.current,
        paperWidthCm: paperWidthCm,
        paperHeightCm: paperHeightCm,
        showGuidelines: showGuidelines
      }

      core = new EditorCore(config)

      // 저장 요청 콜백 설정
      core.onSaveRequested = async () => {
        if (!eventId || !isMounted) return

        try {
          setState(prev => ({ ...prev, isSaving: true }))

          const canvasJson = core.exportJson()
          if (!canvasJson) return

          // EventLayout 저장
          await saveEventLayout({
            eventId,
            templateId: null, // 나중에 템플릿 ID 추가 가능
            canvasJson,
            paperWidthCm: state.paperSettings.widthCm,
            paperHeightCm: state.paperSettings.heightCm,
            backgroundImageUrl: null, // 나중에 배경 이미지 URL 추가
            printAreas: null
          })

          // 자동저장 스냅샷 생성
          await createAutosaveSnapshot(eventId, canvasJson)

          if (isMounted) {
            setState(prev => ({ ...prev, isDirty: false, isSaving: false }))
          }
        } catch (error) {
          console.error('Error saving layout:', error)
          if (isMounted) {
            setState(prev => ({ ...prev, isSaving: false }))
          }
        }
      }

      // 상태 구독
      unsubscribe = core.subscribe((newState) => {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            ...newState
          }))
        }
      })

      // 초기화
      try {
        await core.initialize()
        if (isMounted) {
          editorCoreRef.current = core
          console.log('EditorCore initialized, loading event layout...')
          // 이벤트 레이아웃 로드
          await loadEventLayout(eventId, core)
          console.log('Event layout loading completed')
        }
      } catch (error) {
        console.error('Error initializing EditorCore:', error)
      }
    }

    checkCanvasReady()

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
      if (core) {
        core.destroy()
        core = null
      }
      editorCoreRef.current = null
    }
  }, [eventId, loadEventLayout, paperWidthCm, paperHeightCm, showGuidelines])

  // 명령 래퍼
  const commands = {
    bindProfile: useCallback((profile) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.bindProfile(profile)
      }
    }, []),

    updateSelectedObject: useCallback((props) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.updateSelectedObject(props)
      }
    }, []),

    alignSelected: useCallback((direction) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.alignSelected(direction)
      }
    }, []),

    setBackgroundImage: useCallback((imageUrl) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.setBackgroundImage(imageUrl)
      }
    }, []),

    setPaperSize: useCallback((widthCm, heightCm) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.setPaperSize(widthCm, heightCm)
      }
    }, []),

    toggleGuidelines: useCallback(() => {
      if (editorCoreRef.current) {
        editorCoreRef.current.toggleGuidelines()
      }
    }, []),

    saveLayout: useCallback(async () => {
      if (editorCoreRef.current && editorCoreRef.current.onSaveRequested) {
        await editorCoreRef.current.onSaveRequested()
      }
    }, []),

    loadTemplate: useCallback(async (templateData) => {
      if (editorCoreRef.current) {
        // templateData가 객체면 canvasJson 사용, ID면 템플릿 조회
        if (typeof templateData === 'string') {
          // 템플릿 ID로 템플릿을 가져와서 로드
          const { getTemplateById } = await import('../lib/repositories/TemplateRepository')
          const template = await getTemplateById(templateData)
          if (template && template.canvasJson) {
            console.log('Loading template:', template.templateName)
            await editorCoreRef.current.loadTemplate(template.canvasJson)
          }
        } else if (templateData && templateData.canvasJson) {
          // 템플릿 객체를 직접 받아서 로드
          console.log('Loading template:', templateData.templateName || templateData.template_name)
          await editorCoreRef.current.loadTemplate(templateData.canvasJson)
        } else if (templateData && typeof templateData === 'object') {
          // canvasJson이 직접 전달된 경우
          console.log('Loading template from canvasJson')
          await editorCoreRef.current.loadTemplate(templateData)
        }
      }
    }, []),

    getCanvasJSON: useCallback(() => {
      if (editorCoreRef.current) {
        return editorCoreRef.current.toJSON()
      }
      return null
    }, []),

    loadEventLayout: useCallback(async (eventId) => {
      if (editorCoreRef.current) {
        const eventLayout = await getEventLayout(eventId)
        if (eventLayout && eventLayout.canvasJson) {
          await editorCoreRef.current.loadEventLayout(eventLayout.canvasJson)
        }
      }
    }, []),

    exportToImage: useCallback(async () => {
      if (editorCoreRef.current) {
        return await editorCoreRef.current.exportToImage()
      }
      return ''
    }, []),

    exportToPDF: useCallback(async () => {
      if (editorCoreRef.current) {
        return await editorCoreRef.current.exportToPDF()
      }
      throw new Error('EditorCore not initialized')
    }, []),

    exportJson: useCallback(() => {
      if (editorCoreRef.current) {
        return editorCoreRef.current.exportJson()
      }
      return null
    }, []),

    getCanvas: useCallback(() => {
      if (editorCoreRef.current) {
        return editorCoreRef.current.canvas
      }
      return null
    }, []),

    // 배경 이미지 조절 명령어들
    updateBackgroundOpacity: useCallback((opacity) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.updateBackgroundOpacity(opacity)
      }
    }, []),

    resizeBackgroundImage: useCallback((deltaScale) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.resizeBackgroundImage(deltaScale)
      }
    }, []),

    moveBackgroundImage: useCallback((dx, dy) => {
      if (editorCoreRef.current) {
        editorCoreRef.current.moveBackgroundImage(dx, dy)
      }
    }, []),

    fitBackgroundImageToCanvas: useCallback(() => {
      if (editorCoreRef.current) {
        editorCoreRef.current.fitBackgroundImageToCanvas()
      }
    }, []),

    selectBackgroundImage: useCallback(() => {
      if (editorCoreRef.current) {
        editorCoreRef.current.selectBackgroundImage()
      }
    }, [])
  }

  return {
    canvasRef,
    state,
    commands
  }
}

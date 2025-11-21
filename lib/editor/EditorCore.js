/**
 * EditorCore
 * React에 의존하지 않는 순수 로직 클래스
 * Fabric.js 캔버스 관리 및 도메인 로직 처리
 */

// Fabric.js는 동적으로 로드됨 (클라이언트 사이드에서만 사용)

/**
 * @typedef {Object} EditorCoreConfig
 * @property {HTMLCanvasElement} canvasElement
 * @property {number} paperWidthCm
 * @property {number} paperHeightCm
 * @property {boolean} showGuidelines
 */

/**
 * @typedef {Object} ObjectProps
 * @property {string} id
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 * @property {number} fontSize
 * @property {string} fontFamily
 * @property {string} fontWeight
 * @property {string} fill
 * @property {string} textAlign
 * @property {number} angle
 * @property {number} scaleX
 * @property {number} scaleY
 * @property {number} opacity
 * @property {string} [dataField] - 'company' | 'name' | 'title' 등
 */

/**
 * @typedef {Object} EditorState
 * @property {boolean} canvasReady
 * @property {string} [selectedObjectId]
 * @property {ObjectProps} [selectedObjectProps]
 * @property {string} [currentProfileId]
 * @property {boolean} isDirty
 * @property {boolean} isSaving
 * @property {Object} paperSettings
 */

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} [name]
 * @property {string} [company]
 * @property {string} [title]
 */

export class EditorCore {
  /**
   * @param {EditorCoreConfig} config
   */
  constructor(config) {
    this.config = config
    this.canvas = null
    this.fabric = null
    this.state = {
      canvasReady: false,
      isDirty: false,
      isSaving: false,
      paperSettings: {
        widthCm: config.paperWidthCm,
        heightCm: config.paperHeightCm,
        showGuidelines: config.showGuidelines
      }
    }
    this.subscribers = []
    this.saveDebounceTimer = null
    this.currentProfile = null
    this.lastNotifiedState = null // 상태 변경 감지를 위한 이전 상태 저장
  }

  /**
   * Fabric.js 로드 및 캔버스 초기화
   * @returns {Promise<void>}
   */
  async initialize() {
    if (typeof window === 'undefined') {
      throw new Error('EditorCore can only be used in browser environment')
    }

    // Fabric.js 동적 로드
    if (!this.fabric) {
      const fabricModule = await import('fabric')
      this.fabric = fabricModule.fabric
    }

    // 캔버스 크기 계산 (cm to px: 37.8px/cm)
    const widthPx = Math.round(this.config.paperWidthCm * 37.8)
    const heightPx = Math.round(this.config.paperHeightCm * 37.8)

    // Fabric Canvas 생성
    this.canvas = new this.fabric.Canvas(this.config.canvasElement, {
      width: widthPx,
      height: heightPx,
      backgroundColor: '#ffffff',
      enableRetinaScaling: true,
      imageSmoothingEnabled: true,
      selection: true,
      preserveObjectStacking: true
    })
    
    // Canvas 인스턴스에 fabric 객체를 명시적으로 연결
    // loadFromJSON에서 fabric 객체를 찾을 수 있도록
    if (this.canvas && this.fabric) {
      this.canvas.fabric = this.fabric
    }

    // 이벤트 리스너 설정
    this.setupEventListeners()

    // 가이드라인 추가
    if (this.config.showGuidelines) {
      this.updateGuidelines()
    }

    // 상태 업데이트
    this.state.canvasReady = true
    this.notifySubscribers()

    console.log('EditorCore initialized')
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    if (!this.canvas) return

    // 객체 선택
    this.canvas.on('selection:created', (e) => {
      this.handleSelectionChange(e.selected[0])
    })

    this.canvas.on('selection:updated', (e) => {
      this.handleSelectionChange(e.selected[0])
    })

    this.canvas.on('selection:cleared', () => {
      this.handleSelectionChange(null)
    })

    // 객체 수정 (이동, 크기 조정 등)
    this.canvas.on('object:modified', () => {
      this.handleObjectModified()
    })

    // 객체 이동 중
    this.canvas.on('object:moving', () => {
      this.handleObjectMoving()
    })
  }

  /**
   * 선택 변경 핸들러
   * @param {fabric.Object|null} object
   */
  handleSelectionChange(object) {
    if (!object) {
      this.state.selectedObjectId = undefined
      this.state.selectedObjectProps = undefined
    } else {
      this.state.selectedObjectId = object.id || object.name
      this.state.selectedObjectProps = this.extractObjectProps(object)
    }
    this.notifySubscribers()
  }

  /**
   * 객체 수정 핸들러
   */
  handleObjectModified() {
    if (!this.canvas) return

    const activeObject = this.canvas.getActiveObject()
    if (activeObject) {
      this.state.selectedObjectProps = this.extractObjectProps(activeObject)
    }

    this.state.isDirty = true
    this.notifySubscribers()

    // 디바운스된 저장 예약
    this.scheduleSave()
  }

  /**
   * 객체 이동 중 핸들러
   */
  handleObjectMoving() {
    if (!this.canvas) return

    const activeObject = this.canvas.getActiveObject()
    if (activeObject) {
      this.state.selectedObjectProps = this.extractObjectProps(activeObject)
      this.notifySubscribers()
    }
  }

  /**
   * 객체 속성 추출
   * @param {fabric.Object} object
   * @returns {ObjectProps}
   */
  extractObjectProps(object) {
    return {
      id: object.id || object.name || '',
      left: Math.round(object.left || 0),
      top: Math.round(object.top || 0),
      width: Math.round((object.width || 0) * (object.scaleX || 1)),
      height: Math.round((object.height || 0) * (object.scaleY || 1)),
      fontSize: object.fontSize || 16,
      fontFamily: object.fontFamily || 'Arial',
      fontWeight: object.fontWeight || 'normal',
      fill: object.fill || '#000000',
      textAlign: object.textAlign || 'left',
      angle: Math.round(object.angle || 0),
      scaleX: object.scaleX || 1,
      scaleY: object.scaleY || 1,
      opacity: object.opacity !== undefined ? object.opacity : 1,
      dataField: object.dataField
    }
  }

  /**
   * 프로필 바인딩 (텍스트만 교체, 레이아웃은 유지)
   * @param {Profile|null} profile
   */
  bindProfile(profile) {
    if (!this.canvas) return

    this.currentProfile = profile

    // 모든 텍스트 객체 중 dataField가 있는 것만 순회
    const objects = this.canvas.getObjects()
    const textObjects = objects.filter(obj => 
      (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') && 
      obj.dataField
    )

    // 중복 제거: 같은 dataField를 가진 객체가 여러 개 있으면 첫 번째만 남기고 나머지 제거
    const fieldMap = new Map()
    textObjects.forEach(obj => {
      const dataField = obj.dataField
      if (fieldMap.has(dataField)) {
        // 이미 같은 dataField를 가진 객체가 있으면 제거
        console.log(`Removing duplicate text object with dataField: ${dataField}`)
        this.canvas.remove(obj)
      } else {
        fieldMap.set(dataField, obj)
      }
    })

    // 남은 텍스트 객체들 업데이트
    fieldMap.forEach((obj, dataField) => {
      if (profile) {
        // 프로필 필드 매핑
        const fieldValueMap = {
          'company': profile.company || '',
          'name': profile.name || '',
          'title': profile.title || ''
        }

        const newText = fieldValueMap[dataField] || ''
        if (obj.text !== newText) {
          obj.set('text', newText)
          obj.setCoords()
        }
      } else {
        // 프로필이 없으면 빈 문자열
        if (obj.text !== '') {
          obj.set('text', '')
          obj.setCoords()
        }
      }
    })

    this.canvas.renderAll()
    this.state.currentProfileId = profile?.id
    this.notifySubscribers()
  }

  /**
   * 선택된 객체 속성 업데이트
   * @param {Partial<ObjectProps>} props
   */
  updateSelectedObject(props) {
    if (!this.canvas) return

    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    // 속성 적용
    Object.keys(props).forEach(key => {
      if (key !== 'id' && key !== 'dataField') {
        activeObject.set(key, props[key])
      }
    })

    activeObject.setCoords()
    this.canvas.renderAll()

    // 상태 업데이트
    this.state.selectedObjectProps = this.extractObjectProps(activeObject)
    this.state.isDirty = true
    this.notifySubscribers()

    this.scheduleSave()
  }

  /**
   * 선택된 객체 정렬
   * @param {'horizontal' | 'vertical' | 'center'} direction
   */
  alignSelected(direction) {
    if (!this.canvas) return

    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    const canvasWidth = this.canvas.getWidth()
    const canvasHeight = this.canvas.getHeight()

    switch (direction) {
      case 'horizontal':
        activeObject.set('left', canvasWidth / 2)
        activeObject.set('originX', 'center')
        break
      case 'vertical':
        activeObject.set('top', canvasHeight / 2)
        activeObject.set('originY', 'center')
        break
      case 'center':
        activeObject.set('left', canvasWidth / 2)
        activeObject.set('top', canvasHeight / 2)
        activeObject.set('originX', 'center')
        activeObject.set('originY', 'center')
        break
    }

    activeObject.setCoords()
    this.canvas.renderAll()

    this.state.selectedObjectProps = this.extractObjectProps(activeObject)
    this.state.isDirty = true
    this.notifySubscribers()

    this.scheduleSave()
  }

  /**
   * 배경 이미지 설정
   * @param {string} imageUrl 이미지 URL
   * @param {number} opacity 투명도 (기본 1.0)
   */
  async setBackgroundImage(imageUrl, opacity = 1.0) {
    if (!this.canvas || !this.fabric) return

    try {
      // 기존 배경 이미지 제거
      this.removeBackgroundImage()

      // 새 배경 이미지 로드
      this.fabric.Image.fromURL(imageUrl, (img) => {
        if (!img) {
          console.error('Failed to load background image')
          return
        }

        const canvasWidth = this.canvas.getWidth()
        const canvasHeight = this.canvas.getHeight()

        // 캔버스 크기에 꽉 차게 스케일 조정
        const scaleX = canvasWidth / img.width
        const scaleY = canvasHeight / img.height

        img.set({
          left: 0,
          top: 0,
          scaleX: scaleX,
          scaleY: scaleY,
          opacity: opacity,
          selectable: true,   // 선택해서 투명도 조절 가능하게
          evented: true,
          type: 'background', // 타입 지정 (중요)
          src: imageUrl,      // URL 저장 (템플릿 저장 시 필요)
          zIndex: -999        // 제일 뒤로
        })

        this.canvas.add(img)
        this.canvas.sendToBack(img)
        this.canvas.renderAll()

        this.state.isDirty = true
        this.notifySubscribers()
        this.scheduleSave()
      }, { crossOrigin: 'anonymous' })
    } catch (error) {
      console.error('Error setting background image:', error)
      throw error
    }
  }

  /**
   * 배경 이미지 제거
   */
  removeBackgroundImage() {
    if (!this.canvas) return

    const objects = this.canvas.getObjects()
    objects.forEach((obj) => {
      if (obj.type === 'background') {
        this.canvas.remove(obj)
      }
    })
    this.canvas.renderAll()
    this.state.isDirty = true
    this.notifySubscribers()
    this.scheduleSave()
  }

  /**
   * 배경 이미지 투명도 변경
   * @param {number} opacity 0.0 ~ 1.0
   */
  updateBackgroundOpacity(opacity) {
    if (!this.canvas) return

    const bg = this.canvas.getObjects().find(obj => obj.type === 'background')
    if (!bg) return

    bg.set('opacity', Math.max(0, Math.min(1, opacity)))
    this.canvas.renderAll()
    this.state.isDirty = true
    this.notifySubscribers()
    this.scheduleSave()
  }

  /**
   * 배경 이미지 크기 조절
   * @param {number} deltaScale 스케일 변화량
   */
  resizeBackgroundImage(deltaScale) {
    if (!this.canvas) return

    const bg = this.canvas.getObjects().find(obj => obj.type === 'background')
    if (!bg) return

    const newScaleX = Math.max(0.1, bg.scaleX + deltaScale)
    const newScaleY = Math.max(0.1, bg.scaleY + deltaScale)

    bg.set({ scaleX: newScaleX, scaleY: newScaleY })
    bg.setCoords()
    this.canvas.renderAll()
    this.state.isDirty = true
    this.notifySubscribers()
    this.scheduleSave()
  }

  /**
   * 배경 이미지 위치 이동
   * @param {number} dx X축 이동량
   * @param {number} dy Y축 이동량
   */
  moveBackgroundImage(dx, dy) {
    if (!this.canvas) return

    const bg = this.canvas.getObjects().find(obj => obj.type === 'background')
    if (!bg) return

    bg.set({
      left: bg.left + dx,
      top: bg.top + dy
    })
    bg.setCoords()
    this.canvas.renderAll()
    this.state.isDirty = true
    this.notifySubscribers()
    this.scheduleSave()
  }

  /**
   * 배경 이미지를 캔버스 크기에 맞춤
   */
  fitBackgroundImageToCanvas() {
    if (!this.canvas) return

    const bg = this.canvas.getObjects().find(obj => obj.type === 'background')
    if (!bg) return

    bg.scaleToWidth(this.canvas.getWidth())
    bg.scaleToHeight(this.canvas.getHeight())
    bg.set({ left: 0, top: 0 })
    bg.setCoords()
    this.canvas.renderAll()
    this.state.isDirty = true
    this.notifySubscribers()
    this.scheduleSave()
  }

  /**
   * 배경 이미지 선택
   */
  selectBackgroundImage() {
    if (!this.canvas) return

    const bg = this.canvas.getObjects().find(obj => obj.type === 'background')
    if (bg) {
      this.canvas.setActiveObject(bg)
      this.canvas.renderAll()
      this.state.selectedObjectProps = this.extractObjectProps(bg)
      this.notifySubscribers()
    }
  }

  /**
   * 용지 크기 설정
   * @param {number} widthCm
   * @param {number} heightCm
   */
  setPaperSize(widthCm, heightCm) {
    if (!this.canvas) return

    const widthPx = Math.round(widthCm * 37.8)
    const heightPx = Math.round(heightCm * 37.8)

    this.canvas.setDimensions({
      width: widthPx,
      height: heightPx
    })

    // 객체 좌표 업데이트
    this.canvas.getObjects().forEach(obj => {
      obj.setCoords()
    })

    this.state.paperSettings.widthCm = widthCm
    this.state.paperSettings.heightCm = heightCm
    this.updateGuidelines()
    this.canvas.renderAll()

    this.state.isDirty = true
    this.notifySubscribers()
    this.scheduleSave()
  }

  /**
   * 가이드라인 토글
   */
  toggleGuidelines() {
    this.state.paperSettings.showGuidelines = !this.state.paperSettings.showGuidelines
    this.updateGuidelines()
    this.notifySubscribers()
  }

  /**
   * 가이드라인 업데이트
   */
  updateGuidelines() {
    if (!this.canvas || !this.fabric) return

    // 기존 가이드라인 제거
    const existing = this.canvas.getObjects().filter(obj => obj.type === 'guideline')
    existing.forEach(obj => this.canvas.remove(obj))

    if (!this.state.paperSettings.showGuidelines) return

    const widthPx = this.canvas.getWidth()
    const heightPx = this.canvas.getHeight()
    const marginPx = Math.round(0.5 * 37.8) // 5mm

    // 외곽선
    const outerRect = new this.fabric.Rect({
      left: 0,
      top: 0,
      width: widthPx,
      height: heightPx,
      fill: 'transparent',
      stroke: '#ff0000',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      type: 'guideline'
    })

    // 안전 여백
    const innerRect = new this.fabric.Rect({
      left: marginPx,
      top: marginPx,
      width: widthPx - (marginPx * 2),
      height: heightPx - (marginPx * 2),
      fill: 'transparent',
      stroke: '#00ff00',
      strokeWidth: 1,
      strokeDashArray: [3, 3],
      selectable: false,
      evented: false,
      type: 'guideline'
    })

    // 중앙선 (가로)
    const centerH = new this.fabric.Line([0, heightPx / 2, widthPx, heightPx / 2], {
      stroke: '#0000ff',
      strokeWidth: 1,
      strokeDashArray: [2, 2],
      selectable: false,
      evented: false,
      type: 'guideline'
    })

    // 중앙선 (세로)
    const centerV = new this.fabric.Line([widthPx / 2, 0, widthPx / 2, heightPx], {
      stroke: '#0000ff',
      strokeWidth: 1,
      strokeDashArray: [2, 2],
      selectable: false,
      evented: false,
      type: 'guideline'
    })

    this.canvas.add(outerRect, innerRect, centerH, centerV)
    this.canvas.sendToBack(outerRect)
    this.canvas.renderAll()
  }

  /**
   * 기본 템플릿 생성
   * 기존 텍스트 객체가 있으면 제거하고 새로 생성
   */
  createDefaultTemplate() {
    if (!this.canvas || !this.fabric) {
      console.error('Cannot create default template: canvas or fabric not ready')
      return
    }

    console.log('Creating default template with text objects')

    // 기존 텍스트 객체 제거 (dataField가 있는 텍스트 객체만)
    const objects = this.canvas.getObjects()
    const textObjectsToRemove = objects.filter(obj => 
      (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') && 
      obj.dataField
    )
    
    if (textObjectsToRemove.length > 0) {
      console.log(`Removing ${textObjectsToRemove.length} existing text objects before creating default template`)
      textObjectsToRemove.forEach(obj => {
        this.canvas.remove(obj)
      })
    }

    // 중복 체크: 같은 dataField를 가진 객체가 이미 있는지 확인
    const remainingObjects = this.canvas.getObjects()
    const existingFields = new Set()
    remainingObjects.forEach(obj => {
      if ((obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') && obj.dataField) {
        existingFields.add(obj.dataField)
      }
    })

    // 캔버스 중앙 좌표
    const centerX = this.canvas.getWidth() / 2
    const centerY = this.canvas.getHeight() / 2

    // 회사명 텍스트 (중복 체크)
    if (!existingFields.has('company')) {
      const companyText = new this.fabric.IText('회사명', {
        dataField: 'company',
        left: centerX,
        top: centerY - 80,
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#000000',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        lockScalingX: true,
        lockScalingY: true,
        lockUniScaling: true
      })
      this.canvas.add(companyText)
      console.log('Added company text at:', centerX, centerY - 80)
    } else {
      console.log('Company text already exists, skipping')
    }

    // 이름 텍스트 (중복 체크)
    if (!existingFields.has('name')) {
      const nameText = new this.fabric.IText('이름', {
        dataField: 'name',
        left: centerX,
        top: centerY,
        fontSize: 32,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#000000',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        lockScalingX: true,
        lockScalingY: true,
        lockUniScaling: true
      })
      this.canvas.add(nameText)
      console.log('Added name text at:', centerX, centerY)
    } else {
      console.log('Name text already exists, skipping')
    }

    // 직급 텍스트 (중복 체크)
    if (!existingFields.has('title')) {
      const titleText = new this.fabric.IText('직급', {
        dataField: 'title',
        left: centerX,
        top: centerY + 80,
        fontSize: 20,
        fontFamily: 'Arial',
        fill: '#000000',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        lockScalingX: true,
        lockScalingY: true,
        lockUniScaling: true
      })
      this.canvas.add(titleText)
      console.log('Added title text at:', centerX, centerY + 80)
    } else {
      console.log('Title text already exists, skipping')
    }

    this.canvas.renderAll()
    this.state.isDirty = false
    this.notifySubscribers()
    
    const finalObjects = this.canvas.getObjects()
    const textObjects = finalObjects.filter(obj => 
      (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') && 
      obj.dataField
    )
    console.log('Default template created successfully, total objects:', finalObjects.length, 'text objects:', textObjects.length)
  }

  /**
   * 텍스트 객체 중복 제거
   * 같은 dataField를 가진 객체가 여러 개 있으면 첫 번째만 남기고 나머지 제거
   */
  removeDuplicateTextObjects() {
    if (!this.canvas) return

    const objects = this.canvas.getObjects()
    const textObjects = objects.filter(obj =>
      (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') &&
      obj.dataField
    )

    const fieldMap = new Map()
    let removedCount = 0

    textObjects.forEach(obj => {
      const dataField = obj.dataField
      if (fieldMap.has(dataField)) {
        // 중복 제거
        this.canvas.remove(obj)
        removedCount++
        console.log(`Removing duplicate text object with dataField: ${dataField}`)
      } else {
        fieldMap.set(dataField, obj)
      }
    })

    if (removedCount > 0) {
      this.canvas.renderAll()
      console.log(`Removed ${removedCount} duplicate text objects`)
    }

    return removedCount
  }

  /**
   * 템플릿 로드 (수동 객체 생성 방식 - 안정적)
   * @param {Object} canvasJson - Fabric.js 캔버스 JSON
   */
  async loadTemplate(canvasJson) {
    if (!this.canvas || !this.fabric) {
      console.error('Cannot load template: canvas or fabric not ready')
      return
    }

    try {
      return new Promise(async (resolve, reject) => {
        // 기존 객체 모두 제거 (템플릿 로드 전 정리)
        this.canvas.clear()
        
        console.log('Loading template JSON:', canvasJson)
        console.log('Template objects count:', canvasJson.objects?.length || 0)
        console.log('Template version:', canvasJson.version)
        
        const objects = canvasJson.objects || []
        const asyncTasks = []
        
        // 캔버스 크기 및 배경색 설정
        if (canvasJson.canvas) {
          if (canvasJson.canvas.width) {
            this.canvas.setWidth(canvasJson.canvas.width)
          }
          if (canvasJson.canvas.height) {
            this.canvas.setHeight(canvasJson.canvas.height)
          }
          if (canvasJson.canvas.backgroundColor) {
            this.canvas.setBackgroundColor(canvasJson.canvas.backgroundColor, this.canvas.renderAll.bind(this.canvas))
          }
        }
        
        // 배경 이미지 로드
        const backgroundObj = objects.find(obj => obj.type === 'background' || (obj.type === 'image' && obj.src))
        if (backgroundObj && backgroundObj.src) {
          console.log('Loading background image from template:', backgroundObj.src)
          
          const backgroundPromise = new Promise((bgResolve, bgReject) => {
            this.fabric.Image.fromURL(
              backgroundObj.src,
              (img) => {
                if (!img) {
                  console.error('Failed to load background image:', backgroundObj.src)
                  bgReject(new Error(`Background image load failed: ${backgroundObj.src}`))
                  return
                }
                
                const canvasWidth = this.canvas.width
                const canvasHeight = this.canvas.height
                
                // 캔버스 크기에 맞게 스케일 조정
                const scaleX = backgroundObj.scaleX || (canvasWidth / img.width)
                const scaleY = backgroundObj.scaleY || (canvasHeight / img.height)
                
                img.set({
                  left: backgroundObj.left || 0,
                  top: backgroundObj.top || 0,
                  scaleX: scaleX,
                  scaleY: scaleY,
                  angle: backgroundObj.angle || 0,
                  opacity: backgroundObj.opacity !== undefined ? backgroundObj.opacity : 1,
                  selectable: true,
                  evented: true,
                  type: 'background',
                  src: backgroundObj.src,
                  originX: backgroundObj.originX || 'left',
                  originY: backgroundObj.originY || 'top'
                })
                
                img.setCoords()
                this.canvas.add(img)
                this.canvas.sendToBack(img)
                console.log('Background image loaded successfully')
                bgResolve()
              },
              { crossOrigin: 'anonymous' }
            )
          })
          asyncTasks.push(backgroundPromise)
        }
        
        // 텍스트 객체들 복원
        for (const objData of objects) {
          if (objData.type === 'i-text' || objData.type === 'text' || objData.type === 'textbox') {
            // 텍스트 객체는 동기 처리
            const textObj = new this.fabric.IText(objData.text || '', {
              dataField: objData.dataField, // 커스텀 속성 복원
              left: objData.left,
              top: objData.top,
              width: objData.width,
              height: objData.height,
              fontSize: objData.fontSize,
              fontFamily: objData.fontFamily,
              fontWeight: objData.fontWeight,
              fontStyle: objData.fontStyle,
              fill: objData.fill,
              textAlign: objData.textAlign,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              originX: objData.originX || 'left',
              originY: objData.originY || 'top',
              lockScalingX: true,
              lockScalingY: true,
              lockUniScaling: true
            })
            textObj.setCoords()
            this.canvas.add(textObj)
          } else if (objData.type === 'rect' || objData.type === 'circle' || objData.type === 'triangle') {
            // 도형 객체들도 복원 (선택적)
            let shapeObj = null
            if (objData.type === 'rect') {
              shapeObj = new this.fabric.Rect({
                left: objData.left,
                top: objData.top,
                width: objData.width,
                height: objData.height,
                fill: objData.fill,
                stroke: objData.stroke,
                strokeWidth: objData.strokeWidth || 0
              })
            } else if (objData.type === 'circle') {
              shapeObj = new this.fabric.Circle({
                left: objData.left,
                top: objData.top,
                radius: objData.radius,
                fill: objData.fill,
                stroke: objData.stroke,
                strokeWidth: objData.strokeWidth || 0
              })
            } else if (objData.type === 'triangle') {
              shapeObj = new this.fabric.Triangle({
                left: objData.left,
                top: objData.top,
                width: objData.width,
                height: objData.height,
                fill: objData.fill,
                stroke: objData.stroke,
                strokeWidth: objData.strokeWidth || 0
              })
            }
            
            if (shapeObj) {
              shapeObj.setCoords()
              this.canvas.add(shapeObj)
            }
          }
          // background 타입은 이미 위에서 처리했으므로 스킵
        }
        
        // 모든 비동기 작업 완료 대기
        try {
          await Promise.all(asyncTasks)
        } catch (error) {
          console.warn('Some async tasks failed during template load:', error)
          // 배경 이미지 로드 실패해도 계속 진행
        }
        
        // 템플릿 로드 후 중복 제거 (중요!)
        const removedCount = this.removeDuplicateTextObjects()
        
        this.canvas.renderAll()
        this.state.isDirty = false
        this.notifySubscribers()
        
        // 템플릿이 빈 객체이거나 텍스트 객체가 없으면 기본 템플릿 생성
        const canvasObjects = this.canvas.getObjects()
        const hasTextObjects = canvasObjects.some(obj =>
          (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') &&
          obj.dataField
        )
        
        if (!hasTextObjects) {
          console.log('Loaded template has no text objects, creating default template')
          this.createDefaultTemplate()
        } else {
          const textObjects = canvasObjects.filter(obj =>
            (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') &&
            obj.dataField
          )
          console.log('Template loaded successfully with', canvasObjects.length, 'objects,', textObjects.length, 'text objects', removedCount > 0 ? `(${removedCount} duplicates removed)` : '')
        }
        
        resolve(true)
      })
    } catch (error) {
      console.error('Error loading template:', error)
      // 에러 발생 시 기본 템플릿 생성 시도
      if (this.canvas && this.fabric) {
        console.log('Attempting to create default template after load error')
        this.createDefaultTemplate()
      }
      throw error
    }
  }


  /**
   * 이벤트 레이아웃 로드
   * @param {Object} canvasJson
   */
  async loadEventLayout(canvasJson) {
    await this.loadTemplate(canvasJson)
  }

  /**
   * 캔버스 JSON 내보내기
   * @returns {Object}
   */
  exportJson() {
    if (!this.canvas) return null

    // dataField, src(배경 이미지 URL), type 등 커스텀 속성들을 포함해서 내보내기
    return this.canvas.toJSON(['dataField', 'src', 'id', 'type', 'selectable', 'evented', 'zIndex'])
  }

  /**
   * 템플릿 JSON 추출 (저장용) - exportJson과 동일하지만 별도 메서드로 제공
   * @returns {Object}
   */
  toJSON() {
    return this.exportJson()
  }

  /**
   * 이미지로 내보내기
   * @returns {Promise<string>} Data URL
   */
  async exportToImage() {
    if (!this.canvas) return ''

    return new Promise((resolve) => {
      this.canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2 // 고해상도
      }, (dataUrl) => {
        resolve(dataUrl)
      })
    })
  }

  /**
   * PDF로 내보내기 (향후 구현)
   * @returns {Promise<Blob>}
   */
  async exportToPDF() {
    // TODO: PDF 라이브러리 연동
    throw new Error('PDF export not implemented yet')
  }

  /**
   * 저장 예약 (디바운스)
   */
  scheduleSave() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.onSaveRequested?.()
    }, 500) // 500ms 디바운스
  }

  /**
   * 상태 구독
   * @param {Function} callback
   * @returns {Function} 구독 해제 함수
   */
  subscribe(callback) {
    this.subscribers.push(callback)
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  /**
   * 구독자에게 상태 변경 알림
   * 상태가 실제로 변경되었을 때만 알림 (무한 루프 방지)
   */
  notifySubscribers() {
    const currentState = { ...this.state }
    
    // 이전 상태와 비교하여 변경사항이 있을 때만 알림
    if (this.lastNotifiedState) {
      const stateChanged = JSON.stringify(currentState) !== JSON.stringify(this.lastNotifiedState)
      if (!stateChanged) {
        return // 변경사항이 없으면 알림 생략
      }
    }
    
    // 상태 변경이 있으면 알림 전송
    this.lastNotifiedState = JSON.parse(JSON.stringify(currentState)) // deep copy
    this.subscribers.forEach(callback => {
      try {
        callback(currentState)
      } catch (error) {
        console.error('Error in subscriber callback:', error)
      }
    })
  }

  /**
   * 현재 상태 조회
   * @returns {EditorState}
   */
  getState() {
    return { ...this.state }
  }

  /**
   * 저장 요청 콜백 (외부에서 설정)
   * @type {Function}
   */
  onSaveRequested = null

  /**
   * 정리
   */
  destroy() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    if (this.canvas) {
      this.canvas.dispose()
      this.canvas = null
    }

    this.subscribers = []
    this.state.canvasReady = false
  }
}


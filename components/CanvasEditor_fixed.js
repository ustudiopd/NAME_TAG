  // 프로필 데이터로 캔버스 업데이트 (위치 유지하면서 텍스트만 변경)
  const updateCanvasWithProfile = (profile) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()

    console.log('Updating canvas with profile:', profile)
    console.log('Current objects count:', objects.length)

    // 🔥 새로운 로직: 텍스트 객체들을 Y 좌표 순으로 정렬하여 순서대로 업데이트
    const textObjects = objects
      .filter(obj => obj.type === 'i-text')
      .sort((a, b) => (a.top || 0) - (b.top || 0))

    console.log('Text objects found:', textObjects.length)

    // 텍스트 객체를 순서대로 업데이트 (위치 기반)
    textObjects.forEach((obj, index) => {
      const currentText = obj.text || ''
      console.log(`Text object ${index}: "${currentText}" at position:`, obj.left, obj.top)
      
      // 첫 번째 텍스트 객체는 회사명으로 설정
      if (index === 0) {
        obj.set('text', profile.company || '회사명')
        console.log('Updated first text to company:', profile.company)
      }
      // 두 번째 텍스트 객체는 이름으로 설정
      else if (index === 1) {
        obj.set('text', profile.name || '이름')
        console.log('Updated second text to name:', profile.name)
      }
      // 세 번째 텍스트 객체는 직급으로 설정
      else if (index === 2) {
        obj.set('text', profile.title || '직급')
        console.log('Updated third text to title:', profile.title)
      }
      // 기존 키워드 매칭 로직도 유지 (호환성)
      else {
        const lowerText = currentText.toLowerCase()
        
        if (currentText === '회사명' || currentText === 'Company' || 
            currentText === '회사' || currentText === 'company') {
          obj.set('text', profile.company || '회사명')
          console.log('Updated company text to:', profile.company)
        }
        else if (currentText === '이름' || currentText === 'Name' || 
                 currentText === '성명' || currentText === 'fullname') {
          obj.set('text', profile.name || '이름')
          console.log('Updated name text to:', profile.name)
        }
        else if (currentText === '직급' || currentText === 'Title' || 
                 currentText === 'Position' || currentText === '부서') {
          obj.set('text', profile.title || '직급')
          console.log('Updated title text to:', profile.title)
        }
      }
    })

    canvas.renderAll()
    console.log('Canvas updated with profile data')
  }


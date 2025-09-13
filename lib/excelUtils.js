import * as XLSX from 'xlsx'

// 샘플 엑셀 파일 생성
export function generateSampleExcel() {
  const sampleData = [
    ['이름', '회사명', '직급'],
    ['홍길동', '리더스시스템즈', '과장'],
    ['김철수', 'ABC주식회사', '대리'],
    ['이영희', '테크솔루션', '부장'],
    ['박민수', '인노베이션', '팀장'],
    ['정수진', '글로벌코퍼레이션', '차장']
  ]

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(sampleData)
  
  // 워크북 생성
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '명단')
  
  // 엑셀 파일로 변환
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  
  // Blob 생성
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  
  // 파일 다운로드
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '명단_샘플.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// 엑셀 파일 검증
export function validateExcelFile(file) {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ]

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: '엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.' }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' }
  }

  return { valid: true }
}


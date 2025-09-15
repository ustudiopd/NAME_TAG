'use client'

import { useState, useEffect } from 'react'

export default function ColumnMapping({ 
  headers, 
  sampleData, 
  onMappingComplete, 
  onCancel,
  eventId
}) {
  const [mapping, setMapping] = useState({
    name: '',
    company: '',
    title: '',
    phone_number: '',
    email: ''
  })

  // 자동 매핑 시도
  useEffect(() => {
    if (headers && headers.length > 0) {
      const autoMapping = {
        name: findBestMatch(headers, ['이름', 'name', '성명', '성함']),
        company: findBestMatch(headers, ['회사명', 'company', '회사', '소속']),
        title: findBestMatch(headers, ['직급', 'title', 'position', '직책', '부서']),
        phone_number: findBestMatch(headers, ['전화번호', 'phone', 'phone_number', '연락처', '휴대폰', '핸드폰']),
        email: findBestMatch(headers, ['이메일', 'email', 'e-mail', '메일'])
      }
      setMapping(autoMapping)
    }
  }, [headers])

  // 최적의 컬럼 찾기
  const findBestMatch = (headers, keywords) => {
    for (const keyword of keywords) {
      const index = headers.findIndex(h => 
        h && h.toLowerCase().includes(keyword.toLowerCase())
      )
      if (index !== -1) return headers[index]
    }
    return ''
  }

  // 매핑 변경
  const handleMappingChange = (field, value) => {
    setMapping(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 매핑 완료
  const handleComplete = () => {
    if (!mapping.name) {
      alert('이름 컬럼은 필수입니다.')
      return
    }

    // 매핑된 데이터로 변환
    const mappedData = convertWithMapping(sampleData, mapping)
    onMappingComplete(mappedData)
  }

  // 매핑을 사용하여 데이터 변환
  const convertWithMapping = (data, mapping) => {
    const profiles = []
    
    data.forEach((row, index) => {
      if (index === 0) return // 헤더 스킵
      if (!row || row.length === 0) return

      const name = getValueByColumn(row, mapping.name)
      if (!name) return

      const profile = {
        name: name.toString().trim(),
        company: mapping.company ? (getValueByColumn(row, mapping.company)?.toString().trim() || null) : null,
        title: mapping.title ? (getValueByColumn(row, mapping.title)?.toString().trim() || null) : null,
        phone_number: mapping.phone_number ? (getValueByColumn(row, mapping.phone_number)?.toString().trim() || null) : null,
        email: mapping.email ? (getValueByColumn(row, mapping.email)?.toString().trim() || null) : null,
        is_checked_in: false,
        checked_in_at: null,
        event_id: eventId || null
      }

      profiles.push(profile)
    })

    return profiles
  }

  // 컬럼명으로 값 가져오기
  const getValueByColumn = (row, columnName) => {
    const columnIndex = headers.findIndex(h => h === columnName)
    return columnIndex !== -1 ? row[columnIndex] : null
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">컬럼 매핑</h3>
        <p className="text-sm text-gray-600 mb-4">
          엑셀 파일의 컬럼을 명찰에 사용할 필드에 매핑해주세요.
        </p>
      </div>

      {/* 매핑 설정 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <select
            value={mapping.name}
            onChange={(e) => handleMappingChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">컬럼을 선택하세요</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            회사명
          </label>
          <select
            value={mapping.company}
            onChange={(e) => handleMappingChange('company', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">컬럼을 선택하세요 (선택사항)</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            직급
          </label>
          <select
            value={mapping.title}
            onChange={(e) => handleMappingChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">컬럼을 선택하세요 (선택사항)</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            전화번호
          </label>
          <select
            value={mapping.phone_number}
            onChange={(e) => handleMappingChange('phone_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">컬럼을 선택하세요 (선택사항)</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일
          </label>
          <select
            value={mapping.email}
            onChange={(e) => handleMappingChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">컬럼을 선택하세요 (선택사항)</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 미리보기 */}
      <div>
        <h4 className="font-medium text-gray-700 mb-2">미리보기</h4>
        <div className="max-h-48 overflow-y-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">이름</th>
                {mapping.company && <th className="px-3 py-2 text-left">회사명</th>}
                {mapping.title && <th className="px-3 py-2 text-left">직급</th>}
                {mapping.phone_number && <th className="px-3 py-2 text-left">전화번호</th>}
                {mapping.email && <th className="px-3 py-2 text-left">이메일</th>}
              </tr>
            </thead>
            <tbody>
              {sampleData.slice(1, 6).map((row, index) => {
                const name = getValueByColumn(row, mapping.name)
                if (!name) return null

                return (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">{name}</td>
                    {mapping.company && (
                      <td className="px-3 py-2">
                        {getValueByColumn(row, mapping.company) || '-'}
                      </td>
                    )}
                    {mapping.title && (
                      <td className="px-3 py-2">
                        {getValueByColumn(row, mapping.title) || '-'}
                      </td>
                    )}
                    {mapping.phone_number && (
                      <td className="px-3 py-2">
                        {getValueByColumn(row, mapping.phone_number) || '-'}
                      </td>
                    )}
                    {mapping.email && (
                      <td className="px-3 py-2">
                        {getValueByColumn(row, mapping.email) || '-'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={handleComplete}
          disabled={!mapping.name}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          매핑 완료
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          취소
        </button>
      </div>
    </div>
  )
}

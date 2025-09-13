import { createProfile } from './database'

// 테스트용 명단 데이터
export const testProfiles = [
  {
    company: '리더스시스템즈',
    name: '홍길동',
    title: '과장',
    is_checked_in: false,
    checked_in_at: null
  },
  {
    company: 'ABC주식회사',
    name: '김철수',
    title: '대리',
    is_checked_in: true,
    checked_in_at: new Date().toISOString()
  },
  {
    company: '테크솔루션',
    name: '이영희',
    title: '부장',
    is_checked_in: false,
    checked_in_at: null
  },
  {
    company: '인노베이션',
    name: '박민수',
    title: '팀장',
    is_checked_in: false,
    checked_in_at: null
  },
  {
    company: '글로벌코퍼레이션',
    name: '정수진',
    title: '차장',
    is_checked_in: true,
    checked_in_at: new Date(Date.now() - 3600000).toISOString()
  }
]

// 테스트 데이터 추가 함수
export async function addTestData() {
  try {
    console.log('테스트 데이터 추가 중...')
    
    for (const profile of testProfiles) {
      const { data, error } = await createProfile(profile)
      
      if (error) {
        console.error('Error creating profile:', error)
      } else {
        console.log('Created profile:', data)
      }
    }
    
    console.log('테스트 데이터 추가 완료!')
  } catch (error) {
    console.error('Error adding test data:', error)
  }
}

// 테스트 데이터 추가 버튼 컴포넌트
export function TestDataButton({ onDataAdded }) {
  const handleAddTestData = async () => {
    if (confirm('테스트 데이터를 추가하시겠습니까?')) {
      await addTestData()
      if (onDataAdded) {
        onDataAdded()
      } else {
        window.location.reload()
      }
    }
  }

  return (
    <button
      onClick={handleAddTestData}
      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
    >
      테스트 데이터 추가
    </button>
  )
}

import { useState, useEffect } from 'react'
import { 
  getPrizes, 
  executePrizeDraw,
  executeSinglePrizeDraw,
  getPrizeWinners, 
  resetPrizeDraw 
} from '../lib/prizeDrawDatabase'
import { supabase } from '../lib/supabaseClient'
import confetti from 'canvas-confetti'

export default function PrizeDrawExecution({ prizeDraw, onUpdate }) {
  const [prizes, setPrizes] = useState([])
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationText, setAnimationText] = useState('')
  const [participantCount, setParticipantCount] = useState(0)
  
  // 순차 추첨 상태
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0)
  const [currentPrizeId, setCurrentPrizeId] = useState(null)
  const [currentPrizeWinners, setCurrentPrizeWinners] = useState([])
  const [showCurrentWinners, setShowCurrentWinners] = useState(false)
  const [drawPhase, setDrawPhase] = useState('ready') // 'ready', 'drawing', 'showing', 'completed'
  
  // 카드 애니메이션 상태
  const [flippedCards, setFlippedCards] = useState(new Set())
  const [cardAnimationPhase, setCardAnimationPhase] = useState('idle')
  
  // 전체화면 카드 뒤집기 상태
  
  // 초기 상태 디버깅 (조건부)
  if (process.env.NODE_ENV === 'development') {
    console.log('PrizeDrawExecution 렌더링:', {
      drawPhase,
      currentPrizeIndex,
      prizesLength: prizes.length,
      winnersLength: winners.length
    })
  }

  useEffect(() => {
    loadPrizes()
    loadParticipantCount()
    // loadWinners() 제거 - 버튼으로만 확인
  }, [prizeDraw.id])

  // 경품추첨창에서 오는 재추첨 요청 처리
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('PrizeDrawExecution 메시지 수신:', event.data)
      
      if (event.data?.type === 'PRIZE_DRAW_REDRAW_REQUEST') {
        console.log('재추첨 요청 수신:', event.data)
        const { prizeId, cardIndex, winnerId } = event.data
        
        // 직접 재추첨 실행 (winnerId 사용)
        handleRedrawCardDirect(prizeId, cardIndex, winnerId)
      }
    }

    console.log('PrizeDrawExecution 메시지 리스너 등록')
    window.addEventListener('message', handleMessage)
    return () => {
      console.log('PrizeDrawExecution 메시지 리스너 제거')
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  // ESC 키로 전체화면 닫기 (더 이상 사용하지 않음)
  // useEffect(() => {
  //   const handleKeyPress = (event) => {
  //     if (event.key === 'Escape' && showFullscreenDraw) {
  //       handleFullscreenClose()
  //     }
  //   }
  //   
  //   window.addEventListener('keydown', handleKeyPress)
  //   return () => window.removeEventListener('keydown', handleKeyPress)
  // }, [showFullscreenDraw])

  const loadParticipantCount = async () => {
    try {
      // 선택된 참가자가 있으면 해당 참가자들만 카운트 (체크인 여부와 관계없이)
      if (prizeDraw.selected_participants && Array.isArray(prizeDraw.selected_participants) && prizeDraw.selected_participants.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .in('id', prizeDraw.selected_participants)
          // 체크인 필터 제거
        
        if (!error) {
          setParticipantCount(data?.length || 0)
          console.log('선택된 참가자 수:', data?.length || 0)
        }
      } else {
        // 선택된 참가자가 없으면 모든 참가자 카운트 (체크인 여부와 관계없이)
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('event_id', prizeDraw.event_id)
          // 체크인 필터 제거
        
        if (!error) {
          setParticipantCount(data?.length || 0)
          console.log('모든 참가자 수:', data?.length || 0)
        }
      }
    } catch (err) {
      console.error('Error loading participant count:', err)
    }
  }

  const loadPrizes = async () => {
    try {
      console.log('loadPrizes 호출됨:', prizeDraw.id)
      const { data, error } = await getPrizes(prizeDraw.id)
      if (error) throw error
      // 3등→2등→1등 순서로 정렬 (rank_order 내림차순)
      const sortedPrizes = (data || []).sort((a, b) => b.rank_order - a.rank_order)
      setPrizes(sortedPrizes)
      console.log('경품 로드됨 (3등→2등→1등 순서):', sortedPrizes.map(p => `${p.rank_order}등: ${p.name}`))
      return sortedPrizes
    } catch (err) {
      console.error('Error loading prizes:', err)
      return []
    }
  }

  const loadWinners = async () => {
    try {
      console.log('당첨 결과 확인 버튼 클릭 - 전체 당첨자 목록 새로고침')
      const { data, error } = await getPrizeWinners(prizeDraw.id)
      if (error) throw error
      setWinners(data || [])
      console.log('전체 당첨자 목록 로드 완료:', data?.length || 0, '명')
    } catch (err) {
      console.error('Error loading winners:', err)
    }
  }

  const handleOpenPrizeDrawWindow = () => {
    // 새 창으로 경품추첨창 열기
    const newWindow = window.open(
      `/prize-draw-display/${prizeDraw.id}`,
      'prizeDrawWindow',
      'width=1500,height=1000,scrollbars=yes,resizable=yes'
    )
    
    if (newWindow) {
      // 새 창이 열렸을 때 포커스
      newWindow.focus()
      // 전역 변수로 창 참조 저장
      window.prizeDrawWindow = newWindow
      console.log('경품추첨창 열기 완료')
    } else {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.')
    }
  }

  const handleDrawSpecificPrize = async (prizeId) => {
    console.log('handleDrawSpecificPrize 호출됨:', { prizeId })
    
    if (prizes.length === 0) {
      alert('경품이 설정되지 않았습니다. 설정 탭에서 경품을 추가해주세요.')
      return
    }

    // 실제 경품 인덱스 찾기 (prizeId로 찾기)
    const actualPrizeIndex = prizes.findIndex(p => p.id === prizeId)
    if (actualPrizeIndex === -1) {
      console.error('경품을 찾을 수 없습니다:', prizeId)
      return
    }

    const currentPrize = prizes[actualPrizeIndex]
    console.log('실제 추첨할 경품:', currentPrize)
    console.log('경품 인덱스:', actualPrizeIndex, '경품 순서:', currentPrize.rank_order)
    console.log('현재 prizes 배열:', prizes.map(p => ({ id: p.id, name: p.name, rank_order: p.rank_order })))

    // 해당 경품의 기존 당첨자가 있는지 확인
    const existingWinners = winners.filter(w => w.prize_id === prizeId)
    if (existingWinners.length > 0) {
      if (!confirm(`${currentPrize.rank_order}등은 이미 추첨되었습니다. 다시 추첨하시겠습니까?`)) {
        return
      }
    }

    // 현재 경품 인덱스와 ID 설정 (실제 인덱스 사용)
    setCurrentPrizeIndex(actualPrizeIndex)
    setCurrentPrizeId(prizeId)
    setCurrentPrizeWinners([])
    setShowCurrentWinners(false)
    setFlippedCards(new Set())
    setCardAnimationPhase('idle')
    
    // 경품추첨창에 추첨 시작 알림 보내기
    notifyPrizeDrawWindow(currentPrize)
    
    // 바로 추첨 실행 (경품추첨 실행창에서 텍스트 표시 없이)
    setDrawPhase('drawing')
    
    // 상태 업데이트 후 추첨 실행 (React 상태 업데이트는 비동기)
    setTimeout(() => {
      handleDrawSpecificPrizeDirect(prizeId)
    }, 50)
  }

  // 특정 경품 직접 추첨 실행
  const handleDrawSpecificPrizeDirect = async (prizeId) => {
    console.log('handleDrawSpecificPrizeDirect 호출됨:', { prizeId })
    
    const currentPrize = prizes.find(p => p.id === prizeId)
    if (!currentPrize) {
      console.error('경품을 찾을 수 없습니다:', prizeId)
      return
    }
    
    console.log('직접 추첨할 경품:', currentPrize)
    
    // 경품추첨 실행창에서는 애니메이션 없이 바로 추첨 실행
    try {
      console.log('executeSinglePrizeDraw 호출:', {
        prizeDrawId: prizeDraw.id,
        prizeId: prizeId,
        prizeName: currentPrize.name,
        prizeRank: currentPrize.rank_order
      })
      const { data, error } = await executeSinglePrizeDraw(prizeDraw.id, prizeId, false)
      
      if (error) throw error

      // 추첨 결과 처리 (즉시)
      console.log('PrizeDrawExecution - 추첨 결과 받음:', data)
      console.log('PrizeDrawExecution - 당첨자 데이터 상세:', data?.map((winner, index) => ({
        index,
        id: winner.id,
        profile_id: winner.profile_id,
        profiles: winner.profiles,
        prizes: winner.prizes
      })))
      
      setCurrentPrizeWinners(data || [])
      setDrawPhase('showing')
      setShowCurrentWinners(true)
      
      // 결과를 전체 당첨자 목록에 추가
      setWinners(prev => [...prev, ...(data || [])])
      
      // 전체 당첨자 목록은 자동으로 새로고침하지 않음 (버튼으로 확인)
      
      // 경품추첨창에 추첨 결과 전송
      if (window.prizeDrawWindow && !window.prizeDrawWindow.closed) {
        window.prizeDrawWindow.postMessage({ 
          type: 'PRIZE_DRAW_RESULT', 
          prize: currentPrize,
          winners: data || []
        }, '*')
        console.log('추첨 결과 메시지 전송 완료')
      }

    } catch (err) {
      console.error('Error drawing specific prize:', err)
      setDrawPhase('ready')
      alert(`경품추첨 실행 중 오류가 발생했습니다: ${err.message}`)
    }
  }

  // 경품추첨창에 추첨 시작 알림 보내기
  const notifyPrizeDrawWindow = (prizeData) => {
    console.log('notifyPrizeDrawWindow 호출됨:', prizeData)
    
    // 전역 변수로 저장된 창 참조 사용
    const prizeDrawWindow = window.prizeDrawWindow
    
    if (prizeDrawWindow && !prizeDrawWindow.closed) {
      console.log('경품추첨창에 메시지 전송 중...')
      prizeDrawWindow.postMessage({ 
        type: 'PRIZE_DRAW_START', 
        prize: prizeData 
      }, '*')
      console.log('메시지 전송 완료')
    } else {
      console.log('경품추첨창이 열려있지 않음 - 새로 열기 시도')
      // 창이 닫혀있다면 새로 열기
      handleOpenPrizeDrawWindow()
      // 잠시 후 다시 메시지 전송 시도
      setTimeout(() => {
        if (window.prizeDrawWindow && !window.prizeDrawWindow.closed) {
          window.prizeDrawWindow.postMessage({ 
            type: 'PRIZE_DRAW_START', 
            prize: prizeData 
          }, '*')
          console.log('지연 메시지 전송 완료')
        }
      }, 1000)
    }
  }

  const handleDrawCurrentPrize = async () => {
    console.log('handleDrawCurrentPrize 호출됨', { currentPrizeIndex, currentPrizeId, prizesLength: prizes.length })
    
    // currentPrizeId가 없으면 currentPrizeIndex로 경품 찾기
    let targetPrizeId = currentPrizeId
    if (!targetPrizeId && currentPrizeIndex >= 0 && currentPrizeIndex < prizes.length) {
      targetPrizeId = prizes[currentPrizeIndex].id
      console.log('currentPrizeId가 없어서 currentPrizeIndex로 경품 찾기:', targetPrizeId)
    }
    
    if (!targetPrizeId) {
      console.error('현재 경품 ID가 없습니다')
      return
    }

    const currentPrize = prizes.find(p => p.id === targetPrizeId)
    if (!currentPrize) {
      console.error('현재 경품을 찾을 수 없습니다:', targetPrizeId)
      console.log('현재 prizes 배열:', prizes.map(p => ({ id: p.id, name: p.name, rank_order: p.rank_order })))
      return
    }
    
    console.log('현재 추첨할 경품:', currentPrize)
    console.log('경품 ID 확인:', { 
      찾는_ID: targetPrizeId, 
      찾은_경품_ID: currentPrize.id, 
      일치여부: targetPrizeId === currentPrize.id 
    })
    
    // 경품추첨 실행창에서는 애니메이션 없이 바로 추첨 실행
    try {
      // 현재 경품에 대한 추첨 실행 (초기 추첨이므로 isRedraw = false)
      console.log('executeSinglePrizeDraw 호출:', {
        prizeDrawId: prizeDraw.id,
        prizeId: targetPrizeId,
        prizeName: currentPrize.name,
        prizeRank: currentPrize.rank_order
      })
      const { data, error } = await executeSinglePrizeDraw(prizeDraw.id, targetPrizeId, false)
      
      if (error) throw error

      // 추첨 결과 처리 (즉시)
      console.log('PrizeDrawExecution - 추첨 결과 받음:', data)
      console.log('PrizeDrawExecution - 당첨자 데이터 상세:', data?.map((winner, index) => ({
        index,
        id: winner.id,
        profile_id: winner.profile_id,
        profiles: winner.profiles,
        prizes: winner.prizes
      })))
      
      setCurrentPrizeWinners(data || [])
      setDrawPhase('showing')
      setShowCurrentWinners(true)
      
      // 결과를 전체 당첨자 목록에 추가
      setWinners(prev => [...prev, ...(data || [])])
      
      // 전체 당첨자 목록은 자동으로 새로고침하지 않음 (버튼으로 확인)
      
      // 경품추첨창에 추첨 결과 전송
      if (window.prizeDrawWindow && !window.prizeDrawWindow.closed) {
        window.prizeDrawWindow.postMessage({ 
          type: 'PRIZE_DRAW_RESULT', 
          prize: currentPrize,
          winners: data || []
        }, '*')
        console.log('추첨 결과 메시지 전송 완료')
      }

    } catch (err) {
      console.error('Error drawing current prize:', err)
      setDrawPhase('ready')
      alert(`경품추첨 실행 중 오류가 발생했습니다: ${err.message}`)
    }
  }

  const handleFullscreenClose = () => {
    setShowFullscreenDraw(false)
    setShowCurrentWinners(true)
    setFlippedCards(new Set())
    setCardAnimationPhase('idle')
    
    // 결과를 전체 당첨자 목록에 추가
    setWinners(prev => [...prev, ...currentPrizeWinners])
    
    // 전체 당첨자 목록 새로고침
    loadWinners()
  }

  const handleFullscreenRedraw = async (cardIndex) => {
    console.log('전체화면에서 재추첨 시작:', cardIndex)
    
    try {
      // 해당 카드만 다시 추첨 (isRedraw = true로 전달)
      const currentPrize = prizes[currentPrizeIndex]
      const { data, error } = await executeSinglePrizeDraw(prizeDraw.id, currentPrize.id, true)
      
      if (error) throw error
      
      // 새로운 당첨자로 교체
      const newWinners = [...currentPrizeWinners]
      newWinners[cardIndex] = data[0] // 첫 번째 당첨자로 교체
      setCurrentPrizeWinners(newWinners)
      
      // 카드 다시 뒤집기 애니메이션
      setFlippedCards(new Set())
      setTimeout(() => {
        setFlippedCards(prev => new Set([...prev, cardIndex]))
      }, 500)
      
    } catch (err) {
      console.error('Error redrawing card:', err)
      alert('재추첨 중 오류가 발생했습니다.')
    }
  }



  // 직접 재추첨 실행 (경품추첨창에서 요청)
  const handleRedrawCardDirect = async (prizeId, cardIndex, winnerId) => {
    console.log('직접 재추첨 시작:', { prizeId, cardIndex, winnerId })
    
    try {
      // prizes가 비어있으면 직접 로드
      let currentPrizes = prizes
      if (currentPrizes.length === 0) {
        console.log('prizes가 비어있어서 직접 로드합니다')
        const { data, error } = await getPrizes(prizeDraw.id)
        if (error) throw error
        currentPrizes = (data || []).sort((a, b) => b.rank_order - a.rank_order)
        console.log('직접 로드된 경품들:', currentPrizes.map(p => `${p.rank_order}등: ${p.name}`))
      }
      
      // 경품 정보 찾기
      const currentPrize = currentPrizes.find(p => p.id === prizeId)
      if (!currentPrize) {
        console.error('재추첨할 경품을 찾을 수 없습니다:', prizeId)
        console.log('현재 prizes:', currentPrizes.map(p => ({ id: p.id, name: p.name })))
        return
      }
      
      console.log('재추첨할 경품:', currentPrize)
      
      // 재추첨 실행
      const { data, error } = await executeSinglePrizeDraw(prizeDraw.id, prizeId, true)
      
      if (error) throw error
      
      console.log('재추첨 결과:', data)
      
      // 현재 당첨자 목록 업데이트 (winnerId 사용)
      setCurrentPrizeWinners(prev => {
        // currentPrizeWinners가 비어있으면 전체 당첨자에서 해당 경품의 당첨자들을 찾아서 설정
        if (prev.length === 0) {
          // winners에서 해당 경품의 당첨자들을 추첨 순서대로 정렬
          const currentPrizeWinners = winners
            .filter(w => w.prize_id === prizeId)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // 추첨 순서대로 정렬
          
          console.log('currentPrizeWinners 새로 로드 (winners에서):', { 
            prizeId, 
            cardIndex, 
            winnerId,
            currentPrizeWinners: currentPrizeWinners.map(w => ({ id: w.id, name: w.profiles?.name }))
          })
          return currentPrizeWinners
        } else {
          // winnerId를 사용하여 정확한 당첨자를 찾아서 교체
          const newWinners = [...prev]
          const foundIndex = newWinners.findIndex(w => w.id === winnerId)
          
          if (foundIndex !== -1) {
            newWinners[foundIndex] = data[0]
            console.log('currentPrizeWinners 업데이트 (winnerId 사용):', { 
              cardIndex, 
              winnerId,
              foundIndex,
              newWinner: data[0]
            })
            
            // 경품추첨창에 즉시 업데이트 알림 (카드 배열 순서 유지)
            if (window.prizeDrawWindow && !window.prizeDrawWindow.closed) {
              // 카드 배열 순서를 유지하여 전송 (재정렬하지 않음)
              window.prizeDrawWindow.postMessage({ 
                type: 'PRIZE_DRAW_UPDATE',
                updatedWinners: newWinners
              }, '*')
              console.log('재추첨 업데이트 메시지 즉시 전송 완료 (카드 배열 순서 유지):', { 
                winnerId, 
                foundIndex, 
                newWinners: newWinners.map(w => ({ id: w.id, name: w.profiles?.name }))
              })
            }
          } else {
            console.log('currentPrizeWinners에서 winnerId를 찾을 수 없음:', { winnerId })
          }
          
          return newWinners
        }
      })
      
      // 전체 당첨자 목록도 업데이트 (winnerId 사용)
      setWinners(prev => {
        const updatedWinners = [...prev]
        
        // winnerId로 정확한 당첨자 찾기
        const foundIndex = updatedWinners.findIndex(w => w.id === winnerId)
        
        if (foundIndex !== -1) {
          updatedWinners[foundIndex] = data[0]
          console.log('전체 당첨자 목록 업데이트 (winnerId 사용):', { 
            prizeId, 
            cardIndex, 
            winnerId,
            foundIndex, 
            newWinner: data[0] 
          })
          
          // 경품추첨창에 즉시 업데이트 알림은 setCurrentPrizeWinners에서 처리
        } else {
          console.log('winnerId로 당첨자를 찾을 수 없음:', { winnerId })
        }
        
        return updatedWinners
      })
      
    } catch (err) {
      console.error('Error redrawing card directly:', err)
      alert('재추첨 중 오류가 발생했습니다.')
    }
  }


  const handleResetPrizeDraw = async () => {
    if (!confirm('추첨 결과를 초기화하시겠습니까? 모든 당첨자 정보가 삭제됩니다.')) {
      return
    }

    try {
      console.log('결과 초기화 시작:', prizeDraw.id)
      
      const { error } = await resetPrizeDraw(prizeDraw.id)
      if (error) {
        console.error('resetPrizeDraw 오류:', error)
        throw error
      }

      console.log('데이터베이스 초기화 완료, 로컬 상태 업데이트 중...')

      // 로컬 상태 초기화
      setWinners([])
      setCurrentPrizeIndex(0)
      setCurrentPrizeId(null)
      setCurrentPrizeWinners([])
      setShowCurrentWinners(false)
      setDrawPhase('ready')
      setFlippedCards(new Set())
      setCardAnimationPhase('idle')
      
      // 경품추첨창에 초기화 알림
      if (window.prizeDrawWindow && !window.prizeDrawWindow.closed) {
        window.prizeDrawWindow.postMessage({ 
          type: 'PRIZE_DRAW_RESET' 
        }, '*')
        console.log('초기화 메시지 전송 완료')
      }
      
      console.log('결과 초기화 완료')
      alert('추첨 결과가 초기화되었습니다. 이제 새로운 추첨을 시작할 수 있습니다.')
    } catch (err) {
      console.error('Error resetting prize draw:', err)
      alert(`결과 초기화 중 오류가 발생했습니다: ${err.message}`)
    }
  }


  return (
    <div className="space-y-6 max-w-full">
      {/* 카드 애니메이션을 위한 CSS */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        
        /* 반응형 레이아웃 - 1500px 기준으로 1920px까지 확대 */
        @media (min-width: 1500px) {
          .responsive-container {
            max-width: 1920px;
            margin: 0 auto;
          }
          .responsive-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }
          .responsive-card {
            height: 12rem;
          }
          .responsive-text {
            font-size: 3rem;
          }
        }
        
        @media (min-width: 1920px) {
          .responsive-container {
            max-width: 1920px;
          }
          .responsive-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 2.5rem;
            max-width: 1500px;
            margin: 0 auto;
          }
          .responsive-card {
            height: 14rem;
          }
          .responsive-text {
            font-size: 3.5rem;
          }
        }
      `}</style>
      {/* 추첨 실행 영역 */}
      <div>
        <h5 className="text-sm font-semibold text-gray-900 mb-3">경품추첨 실행</h5>
        
        {/* 경품 목록 */}
        <div className="mb-4">
          <h6 className="text-xs font-medium text-gray-700 mb-2">설정된 경품</h6>
          {prizes.length === 0 ? (
            <p className="text-sm text-gray-500">경품이 설정되지 않았습니다.</p>
          ) : (
            <div className="space-y-1">
              {prizes.map((prize) => (
                <div key={prize.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{prize.name}</span>
                  <span className="text-gray-500">{prize.quantity}개</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 추첨 대상 참가자 정보 */}
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <h6 className="text-xs font-medium text-orange-800 mb-1">추첨 대상 참가자</h6>
          <p className="text-sm text-orange-700">
            총 <span className="font-semibold">{participantCount}명</span>
            {prizeDraw.selected_participants && prizeDraw.selected_participants.length > 0 && (
              <span className="text-xs text-orange-600 ml-1">
                (설정에서 선택된 참가자)
              </span>
            )}
          </p>
        </div>


               {/* 경품추첨창 열기 버튼 */}
               <div className="mb-6 text-center">
                 <button
                   onClick={handleOpenPrizeDrawWindow}
                   className="bg-purple-600 text-white text-xl font-bold px-8 py-4 rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
                 >
                   🎯 경품추첨창 열기
                 </button>
                 <p className="text-sm text-gray-600 mt-2">
                   검은색 배경의 전체화면 추첨창을 엽니다
                 </p>
               </div>

               {/* 개별 경품 추첨 버튼들 */}
               <div className="space-y-3">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   {prizes.map((prize) => (
                     <button
                       key={prize.id}
                       onClick={() => handleDrawSpecificPrize(prize.id)}
                       disabled={false}
                       className="bg-orange-600 text-white text-lg font-bold px-6 py-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                     >
{prize.name} 추첨하기
                     </button>
                   ))}
                 </div>
                 
                 {winners.length > 0 && (
                   <div className="flex justify-center">
                     <button
                       onClick={handleResetPrizeDraw}
                       className="px-6 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
                     >
                       결과 초기화
                     </button>
                   </div>
                 )}
               </div>
      </div>


      {/* 전체 당첨 결과 정리 표시 */}
      {winners.length > 0 && (
        <div className="mb-6 p-6 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-xl font-bold text-blue-800 mb-4 text-center">
            🏆 전체 당첨 결과
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {prizes.map((prize) => {
              const prizeWinners = winners.filter(w => w.prize_id === prize.id)
              return (
                <div key={prize.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 text-center">
                    {prize.name}
                  </h4>
                  
                  {prizeWinners.length > 0 ? (
                    <div className="space-y-2">
                      {prizeWinners.map((winner, index) => (
                        <div key={index} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                          <div className="font-medium text-center">{winner.profiles?.name || '이름 없음'}</div>
                          <div className="text-gray-500 text-center">{winner.profiles?.company || ''}</div>
                          <div className="text-gray-400 text-center text-xs">{winner.profiles?.title || ''}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm text-center py-4">아직 추첨되지 않음</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

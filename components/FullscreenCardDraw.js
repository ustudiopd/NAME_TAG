'use client'

import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function FullscreenCardDraw({ 
  winners, 
  prizeName, 
  onRedraw 
}) {
  const [flippedCards, setFlippedCards] = useState(new Set())
  const [cardAnimationPhase, setCardAnimationPhase] = useState('idle')
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationText, setAnimationText] = useState('')
  const [redrawingCards, setRedrawingCards] = useState(new Set()) // 재추첨 중인 카드들
  const [displayWinners, setDisplayWinners] = useState([]) // 카드에 표시할 당첨자 정보

  useEffect(() => {
    // 컴포넌트 마운트 시 애니메이션 시작
    startCardAnimation()
    
    // ESC 키로 창 닫기
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        window.close()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // winners가 변경될 때 즉시 업데이트
  useEffect(() => {
    if (winners.length > 0) {
      setDisplayWinners(winners)
    }
  }, [winners])

  // 재추첨 결과를 받았을 때 카드 다시 뒤집기
  useEffect(() => {
    if (redrawingCards.size > 0) {
      // 1단계: 카드 뒤집기와 동시에 이름 변경 (투표중... 표시)
      setDisplayWinners(winners) // 즉시 새로운 당첨자 정보로 업데이트
      
      setFlippedCards(prev => {
        const newSet = new Set(prev)
        redrawingCards.forEach(cardIndex => {
          newSet.delete(cardIndex) // 카드를 뒤집어서 투표중... 표시
        })
        return newSet
      })
      
      // 2단계: 2초 후에 카드 펼치기
      setTimeout(() => {
        setFlippedCards(prev => {
          const newSet = new Set(prev)
          redrawingCards.forEach(cardIndex => {
            newSet.add(cardIndex) // 카드를 펼쳐서 새로운 당첨자 표시
          })
          return newSet
        })
        // 재추첨 중 상태 해제
        setRedrawingCards(new Set())
      }, 2000) // 2초 후에 카드 펼치기
    }
  }, [redrawingCards, winners])

  const startCardAnimation = () => {
    setIsAnimating(true)
    setCardAnimationPhase('flipping')
    
    // 추첨 애니메이션 시퀀스
    const animationTexts = ['추첨중...', '뽑는중...', '두근두근...', '당첨자는!']
    let animationIndex = 0
    
    const animationInterval = setInterval(() => {
      setAnimationText(animationTexts[animationIndex % animationTexts.length])
      animationIndex++
    }, 1000)
    
    // 4초 후 카드 뒤집기 시작
    setTimeout(() => {
      clearInterval(animationInterval)
      setAnimationText('')
      
      // displayWinners가 비어있으면 winners 사용
      const currentWinners = displayWinners.length > 0 ? displayWinners : winners
      
      // 각 카드를 순차적으로 뒤집기
      currentWinners.forEach((winner, index) => {
        setTimeout(() => {
          setFlippedCards(prev => new Set([...prev, index]))
        }, index * 800) // 0.8초 간격으로 뒤집기
      })
      
      // 모든 카드 뒤집기 완료 후
      setTimeout(() => {
        setCardAnimationPhase('flipped')
        setIsAnimating(false)
        
        // confetti 효과
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        })
      }, currentWinners.length * 800 + 1000)
    }, 4000)
  }


  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
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
      `}</style>

      {/* 제목 */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black text-white mb-4">
          🎉 {prizeName} 🎉
        </h1>
      </div>

      {/* 카드 그리드 - 카드 개수에 따라 동적 정렬 */}
      <div className={`grid gap-8 mb-12 justify-items-center ${
        (() => {
          const cardCount = (displayWinners.length > 0 ? displayWinners : winners).length
          if (cardCount === 1) return 'justify-center'
          if (cardCount === 2) return 'grid-cols-2'
          if (cardCount === 3) return 'grid-cols-3'
          return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        })()
      }`}>
        {(displayWinners.length > 0 ? displayWinners : winners).map((winner, index) => (
          <div key={index} className="relative">
            {/* 카드 컨테이너 */}
            <div className="relative w-72 h-44 perspective-1000">
              <div 
                className={`relative w-full h-full transition-transform duration-1000 transform-style-preserve-3d ${
                  flippedCards.has(index) ? 'rotate-y-180' : ''
                }`}
              >
                       {/* 카드 앞면 (뒤집기 전) */}
                       <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-2xl flex items-center justify-center">
                         <div className="text-center text-white">
                           <div className="text-7xl mb-4">🎁</div>
                           <div className="text-2xl font-bold">추첨중...</div>
                         </div>
                       </div>
                
                {/* 카드 뒷면 (뒤집기 후) */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl shadow-2xl flex flex-col items-center justify-center p-6" 
                     style={{ background: 'linear-gradient(135deg, #FF9500, #FF7A00)' }}>
                         <div className="text-center text-white">
                           <div className="text-5xl font-black mb-3 leading-tight">
                             {winner.profiles?.name || '이름 없음'}
                           </div>
                           <div className="text-base text-white/90 mb-2">
                             {winner.profiles?.company || ''}
                           </div>
                           <div className="text-sm text-white/80">
                             {winner.profiles?.title || ''}
                           </div>
                         </div>
                </div>
              </div>
            </div>
            
            {/* 재추첨 버튼 */}
            {cardAnimationPhase === 'flipped' && onRedraw && (
              <button
                onClick={() => {
                  // 재추첨 중 상태로 설정
                  setRedrawingCards(prev => new Set([...prev, index]))
                  // 즉시 카드 뒤집기 해제
                  setFlippedCards(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(index)
                    return newSet
                  })
                  // 재추첨 요청 (당첨자 ID와 함께 전달)
                  onRedraw(index, winner.id)
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center"
                title="재추첨"
              >
                ↻
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 애니메이션 중 표시 */}
      {isAnimating && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-6"></div>
          <p className="text-4xl font-bold text-orange-400 mb-2">{animationText}</p>
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      )}

    </div>
  )
}

import { useState } from 'react'
import PrizeDrawManager from './PrizeDrawManager'

export default function PrizeDrawPanel({ eventId }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // 디버깅용 로그
  console.log('PrizeDrawPanel rendered with eventId:', eventId)

  return (
    <div className="w-full">
      <PrizeDrawManager eventId={eventId} />
    </div>
  )
}

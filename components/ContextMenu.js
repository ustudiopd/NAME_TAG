'use client'

import { useState, useEffect, useRef } from 'react'

export default function ContextMenu({ 
  visible, 
  position, 
  onClose, 
  onAction,
  selectedObject 
}) {
  const menuRef = useRef(null)

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible, onClose])

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  if (!visible || !position) return null

  const handleAction = (action) => {
    onAction(action)
    onClose()
  }

  const menuItems = [
    {
      id: 'font-size-up',
      label: '폰트 크기 +',
      icon: '🔍',
      action: () => handleAction('fontSizeUp')
    },
    {
      id: 'font-size-down',
      label: '폰트 크기 -',
      icon: '🔍',
      action: () => handleAction('fontSizeDown')
    },
    {
      id: 'bold',
      label: selectedObject?.fontWeight === 'bold' ? '볼드체 해제' : '볼드체',
      icon: 'B',
      action: () => handleAction('toggleBold')
    },
    {
      id: 'italic',
      label: selectedObject?.fontStyle === 'italic' ? '이탤릭체 해제' : '이탤릭체',
      icon: 'I',
      action: () => handleAction('toggleItalic')
    },
    { id: 'divider1', type: 'divider' },
    {
      id: 'copy',
      label: '복사',
      icon: '📋',
      action: () => handleAction('copy')
    },
    {
      id: 'duplicate',
      label: '복제',
      icon: '📄',
      action: () => handleAction('duplicate')
    },
    {
      id: 'delete',
      label: '삭제',
      icon: '🗑️',
      action: () => handleAction('delete'),
      danger: true
    },
    { id: 'divider2', type: 'divider' },
    {
      id: 'bring-to-front',
      label: '맨 앞으로',
      icon: '⬆️',
      action: () => handleAction('bringToFront')
    },
    {
      id: 'send-to-back',
      label: '맨 뒤로',
      icon: '⬇️',
      action: () => handleAction('sendToBack')
    },
    {
      id: 'center-horizontal',
      label: '가로 중앙',
      icon: '↔️',
      action: () => handleAction('centerHorizontal')
    },
    {
      id: 'center-vertical',
      label: '세로 중앙',
      icon: '↕️',
      action: () => handleAction('centerVertical')
    }
  ]

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50 min-w-[180px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {menuItems.map((item) => {
        if (item.type === 'divider') {
          return (
            <div key={item.id} className="border-t border-gray-200 my-1" />
          )
        }

        return (
          <button
            key={item.id}
            onClick={item.action}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2 ${
              item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

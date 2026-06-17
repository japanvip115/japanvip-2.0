'use client'

import { useEffect } from 'react'

export function ContentProtection({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return

    // CSS: disable text selection
    const style = document.createElement('style')
    style.id = 'content-protection-css'
    style.textContent = `
      body { -webkit-user-select: none; -moz-user-select: none; user-select: none; }
      input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
    `
    document.head.appendChild(style)

    const handleContextMenu = (e: MouseEvent) => e.preventDefault()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['a', 'c', 'x', 'u', 'p', 's'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault()
      }
      if (e.key === 'F12') e.preventDefault()
    }

    const handleDragStart = (e: DragEvent) => e.preventDefault()

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('dragstart', handleDragStart)

    return () => {
      document.getElementById('content-protection-css')?.remove()
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('dragstart', handleDragStart)
    }
  }, [enabled])

  return null
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// UI-only toast queue for <ToastViewport />. push({ tone, title, message }).
export default function useToasts(timeout = 5000) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (toast) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((list) => [...list, { tone: 'info', ...toast, id }])
      if (timeout) timers.current.set(id, setTimeout(() => dismiss(id), timeout))
      return id
    },
    [dismiss, timeout]
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  return { toasts, push, dismiss }
}

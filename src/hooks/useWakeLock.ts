import { useState, useEffect, useCallback, useRef } from 'react'

export function useWakeLock() {
  const [active, setActive] = useState(false)
  const [supported] = useState(
    typeof navigator !== 'undefined' && 'wakeLock' in navigator
  )
  const lockRef = useRef<WakeLockSentinel | null>(null)

  const acquire = useCallback(async () => {
    if (!supported) return
    try {
      lockRef.current = await (navigator as any).wakeLock.request('screen')
      lockRef.current!.addEventListener('release', () => {
        setActive(false)
      })
      setActive(true)
    } catch {
      setActive(false)
    }
  }, [supported])

  const release = useCallback(async () => {
    if (lockRef.current) {
      await lockRef.current.release()
      lockRef.current = null
    }
    setActive(false)
  }, [])

  const toggle = useCallback(() => {
    if (active) {
      release()
    } else {
      acquire()
    }
  }, [active, acquire, release])

  // Re-acquire when tab becomes visible again (browser auto-releases on hide)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active && !lockRef.current) {
        acquire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [active, acquire])

  // Release on unmount
  useEffect(() => {
    return () => { lockRef.current?.release() }
  }, [])

  return { active, supported, toggle }
}

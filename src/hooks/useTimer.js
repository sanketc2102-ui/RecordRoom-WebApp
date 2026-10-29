import { useCallback, useEffect, useRef, useState } from 'react'

// Counts whole seconds. start() / stop() can be called repeatedly (pause and resume);
// reset() sets the clock back to 0.
// It measures real elapsed time (not timer ticks), so the count stays correct even when the
// browser slows down timers in a background tab.
export default function useTimer() {
  const [seconds, setSeconds] = useState(0)
  const baseRef = useRef(0) // milliseconds counted before the current run
  const startedAtRef = useRef(0) // 0 while stopped
  const timerRef = useRef(null)

  const elapsedMs = () =>
    baseRef.current + (startedAtRef.current ? Date.now() - startedAtRef.current : 0)

  const stop = useCallback(() => {
    clearInterval(timerRef.current)
    if (startedAtRef.current) {
      baseRef.current += Date.now() - startedAtRef.current
      startedAtRef.current = 0
    }
    setSeconds(Math.floor(baseRef.current / 1000))
  }, [])

  const start = useCallback(() => {
    clearInterval(timerRef.current)
    if (!startedAtRef.current) startedAtRef.current = Date.now()
    timerRef.current = setInterval(() => setSeconds(Math.floor(elapsedMs() / 1000)), 250)
  }, [])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    baseRef.current = 0
    startedAtRef.current = 0
    setSeconds(0)
  }, [])

  useEffect(() => () => clearInterval(timerRef.current), []) // never leave an interval running

  return { seconds, start, stop, reset }
}

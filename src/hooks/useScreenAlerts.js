import { useEffect } from 'react'

const REPEAT_MS = 20000

const beep = () => {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.15
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => ctx.close()
  } catch {
    /* sound not allowed: the notification and tab title still show */
  }
}

// Tells the user when the screen share stops by itself (screen locked, sleep, "Stop sharing"):
// a desktop notification (click it to come back), a beep, repeated until they share again.
// The notification permission is asked once, when the recording is running.
export default function useScreenAlerts({ active, screenLost }) {
  useEffect(() => {
    if (active && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [active])

  useEffect(() => {
    if (!screenLost) return
    let current = null
    const alert = () => {
      beep()
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      current?.close()
      current = new Notification('Screen sharing stopped', {
        body: 'Your recording is paused. Open RecordRoom and click "Share screen again".',
        tag: 'recordroom-screen-lost',
        requireInteraction: true
      })
      current.onclick = () => {
        window.focus()
        current?.close()
      }
    }
    alert()
    const id = setInterval(alert, REPEAT_MS)
    return () => {
      clearInterval(id)
      current?.close()
    }
  }, [screenLost])
}

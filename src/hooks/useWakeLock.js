import { useEffect } from 'react'

// Keeps the computer awake while `active` is true (recording or paused), so the screen capture
// isn't cut off by the display turning off / the device going idle.
//
// Browsers drop a wake lock whenever the page is hidden (e.g. you switch to the window you are
// teaching in), so we ask for it again each time the page becomes visible.
// Not supported (older Safari/Firefox): does nothing, the recording just behaves as before.
export default function useWakeLock(active) {
  // Fallback: browsers don't let a hidden page hold a wake lock, but a playing video keeps the
  // display awake. A tiny, invisible, muted video fed by a canvas does that (the "NoSleep" trick).
  useEffect(() => {
    if (!active) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 16
    const ctx = canvas.getContext('2d')
    let on = false
    const paint = () => {
      on = !on
      ctx.fillStyle = on ? '#010101' : '#000'
      ctx.fillRect(0, 0, 16, 16)
    }
    paint()
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.loop = true
    video.setAttribute('aria-hidden', 'true')
    video.style.cssText =
      'position:fixed;width:2px;height:2px;opacity:0.01;pointer-events:none;bottom:0;left:0'
    video.srcObject = canvas.captureStream(2)
    document.body.appendChild(video)
    video.play().catch(() => {})
    const timer = setInterval(paint, 1000)
    return () => {
      clearInterval(timer)
      video.pause()
      video.srcObject = null
      video.remove()
    }
  }, [active])

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false

    const acquire = async () => {
      if (cancelled || lock || document.visibilityState !== 'visible') return
      try {
        lock = await navigator.wakeLock.request('screen')
        lock.addEventListener('release', () => {
          lock = null
        })
        if (cancelled) lock.release()
      } catch (err) {
        // Refused (battery saver, permissions policy...). Recording itself is unaffected.
        console.warn('Wake lock not granted', err)
      }
    }

    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      lock?.release()
      lock = null
    }
  }, [active])
}

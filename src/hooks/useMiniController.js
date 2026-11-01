import { useCallback, useEffect, useRef, useState } from 'react'

// Opens a small always-on-top window (Document Picture-in-Picture, Chromium 116+) that shows the
// recording status and holds Pause / Stop. Where it isn't supported, `supported` is false and the
// tab title (useTabTitle) is the only indicator.
export default function useMiniController({ auto = false } = {}) {
  const supported = typeof window !== 'undefined' && 'documentPictureInPicture' in window
  const [pipWindow, setPipWindow] = useState(null)
  const pipRef = useRef(null)

  const close = useCallback(() => {
    pipRef.current?.close()
    pipRef.current = null
    setPipWindow(null)
  }, [])

  // Must be called from a click (browsers require a user gesture).
  const open = useCallback(async () => {
    if (!supported || pipRef.current) return
    try {
      const win = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 80,
        // Chrome otherwise reopens the window at the size/position it was last left at
        preferInitialWindowPlacement: true,
        // hides the "back to tab" button so the little window stays compact
        disallowReturnToOpener: true
      })
      win.document.title = 'RecordRoom'
      try {
        win.resizeTo(320, 80) // some versions ignore the size above; harmless if refused
      } catch {
        /* not allowed without a gesture */
      }
      win.addEventListener('pagehide', () => {
        pipRef.current = null
        setPipWindow(null)
      })
      pipRef.current = win
      setPipWindow(win)
    } catch (err) {
      console.warn('Could not open the mini controller', err)
    }
  }, [supported])

  // Auto-minimize: open the window when the user switches away from this tab.
  // Chrome 134+ fires the Media Session `enterpictureinpicture` action for pages that are
  // capturing the screen/mic, and counts it as a user gesture. Older versions may refuse the
  // visibilitychange attempt (no gesture); that's harmless, the Minimize button still works.
  const autoOpened = useRef(false)
  useEffect(() => {
    if (!supported || !auto) return
    const autoOpen = async () => {
      if (pipRef.current) return
      await open()
      autoOpened.current = !!pipRef.current
    }
    try {
      navigator.mediaSession?.setActionHandler('enterpictureinpicture', autoOpen)
    } catch {
      /* action not supported in this browser */
    }
    const onVisibility = () => {
      if (document.hidden) autoOpen()
      else if (autoOpened.current) {
        // Back on the tab: tuck the floating window away again (only if we opened it)
        autoOpened.current = false
        close()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      try {
        navigator.mediaSession?.setActionHandler('enterpictureinpicture', null)
      } catch {
        /* ignore */
      }
    }
  }, [supported, auto, open, close])

  // Close the floating window when the recording screen goes away (stopped, saved, error)
  useEffect(() => () => pipRef.current?.close(), [])

  return { supported, isOpen: !!pipWindow, pipWindow, open, close }
}

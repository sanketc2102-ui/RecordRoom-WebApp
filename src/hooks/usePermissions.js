import { useState } from 'react'
import { getMicStream, requestScreenPermission, stopStream } from '../utils/media'

const MIC_BLOCKED =
  'Microphone is blocked. Click the lock icon in the address bar, allow Microphone for this site, then click again.'
const SCREEN_BLOCKED =
  'Screen sharing was cancelled or blocked. Click Allow screen again and choose a screen, window or tab to share.'

// Tracks whether the mic and screen are allowed, and the message to show if one is blocked
export default function usePermissions() {
  const [micOk, setMicOk] = useState(false)
  const [screenOk, setScreenOk] = useState(false)
  const [permError, setPermError] = useState('')

  const allowMic = async () => {
    try {
      setPermError('')
      stopStream(await getMicStream()) // just testing access, released right away
      setMicOk(true)
    } catch {
      setPermError(MIC_BLOCKED)
    }
  }

  const allowScreen = async () => {
    try {
      setPermError('')
      // If the user clicks the browser's "Stop sharing" before recording starts, ask again
      await requestScreenPermission(() => setScreenOk(false))
      setScreenOk(true)
    } catch {
      setPermError(SCREEN_BLOCKED)
    }
  }

  return {
    micOk,
    screenOk,
    permError,
    allowMic,
    allowScreen,
    allGranted: micOk && screenOk,
    ready: Number(micOk) + Number(screenOk)
  }
}

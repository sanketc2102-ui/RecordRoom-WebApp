import { FPS, OUT_W, OUT_H, RECORDER_MIME_TYPE } from '../config/constants'

export const getMicStream = () => navigator.mediaDevices.getUserMedia({ audio: true })

export const stopStream = (s) => s?.getTracks().forEach((t) => t.stop())

// ---- Screen ----
// getDisplayMedia() only works from a click, so on the Permissions screen the stream the user
// picks is kept here. Recording then starts with it right away, without asking a second time.
let held = null

const hasLiveVideo = (s) => !!s && s.getVideoTracks().some((t) => t.readyState === 'live')

const requestDisplay = (nav = navigator) => {
  if (!nav.mediaDevices?.getDisplayMedia) {
    throw new Error(
      'This browser can’t record your screen. Open RecordRoom in Chrome or Edge on a computer, over https.'
    )
  }
  return nav.mediaDevices.getDisplayMedia({
    video: { frameRate: FPS, width: { ideal: OUT_W }, height: { ideal: OUT_H } },
    audio: true, // system / tab sound, only if the user ticks "Share audio"
    systemAudio: 'include',
    selfBrowserSurface: 'exclude' // don't offer this tab in the picker
  })
}

// Uses the stream picked on the Permissions screen if there is one, otherwise asks now
export const getScreenStream = async () => {
  if (hasLiveVideo(held)) {
    const s = held
    held = null
    return s
  }
  held = null
  return requestDisplay()
}

// Asks for another screen/window while recording. Call it straight from a click. `win` is the
// window the click happened in (the floating mini controller has its own).
export const requestAnotherScreen = (win = window) => requestDisplay(win.navigator)

// `onLost` runs if the user clicks the browser's "Stop sharing" before recording starts
export const requestScreenPermission = async (onLost) => {
  const s = await requestDisplay()
  stopStream(held)
  held = s
  s.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (held === s) {
      held = null
      onLost?.()
    }
  })
}

// First format the browser can record wins (Safari can't do vp9 webm)
const MIME_CANDIDATES = [
  RECORDER_MIME_TYPE,
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4'
]
export const pickMimeType = () =>
  MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || ''

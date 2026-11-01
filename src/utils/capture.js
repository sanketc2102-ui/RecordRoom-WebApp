// Guaranteed 1080p recording.
// Chromium's screen capture gives you the screen's native size (and won't upscale a small
// screen), so instead we draw the screen onto a fixed 1920x1080 canvas and record the canvas.
import { OUT_W, OUT_H, FPS } from '../config/constants'

// Returns { stream, source: {width, height}, out: {width, height}, setSource(), stop() }
// `stream` is a 1920x1080 video-only MediaStream to give to MediaRecorder.
//
// Frames are read straight from the screen track (MediaStreamTrackProcessor) instead of through a
// <video> element: Chrome stops painting a <video> while this tab is hidden or minimized, and the
// recording then goes black or freezes. Browsers without the API fall back to the <video> element.
export async function createCanvasStream(screenStream) {
  const useProcessor = typeof MediaStreamTrackProcessor !== 'undefined'
  const video = document.createElement('video') // fallback source only
  video.muted = true

  let latest = null // newest VideoFrame (processor mode)
  let reader = null
  let token = 0
  let size = { width: 0, height: 0 }

  const attach = async (stream) => {
    const mine = ++token
    if (!useProcessor) {
      video.srcObject = new MediaStream(stream.getVideoTracks())
      await video.play()
      size = { width: video.videoWidth, height: video.videoHeight }
      return size
    }
    reader?.cancel().catch(() => {})
    const [track] = stream.getVideoTracks()
    const r = new MediaStreamTrackProcessor({ track }).readable.getReader()
    reader = r
    const first = await r.read() // wait for one frame so we know the screen size
    if (first.value) {
      latest?.close()
      latest = first.value
      size = { width: latest.displayWidth, height: latest.displayHeight }
    }
    ;(async () => {
      while (mine === token) {
        const { value, done } = await r.read().catch(() => ({ done: true }))
        if (done) break
        if (mine !== token) {
          value?.close()
          break
        }
        latest?.close()
        latest = value
        size = { width: value.displayWidth, height: value.displayHeight }
      }
    })()
    return size
  }
  await attach(screenStream)

  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const draw = () => {
    const src = useProcessor ? latest : video
    const vw = useProcessor ? size.width : video.videoWidth
    const vh = useProcessor ? size.height : video.videoHeight
    if (!src || !vw || !vh) return
    // fit inside 1920x1080 without stretching (black bars only if the screen isn't 16:9)
    const scale = Math.min(OUT_W / vw, OUT_H / vh)
    const w = vw * scale
    const h = vh * scale
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, OUT_W, OUT_H)
    ctx.drawImage(src, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h)
  }

  draw()
  // A Web Worker clock (not requestAnimationFrame or setInterval): browsers slow those down
  // when this tab is in the background, which is where it is while you record another window.
  const worker = new Worker(new URL('./tick.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = draw
  worker.postMessage(1000 / FPS)
  const stream = canvas.captureStream(FPS)

  return {
    stream,
    source: { ...size },
    out: { width: OUT_W, height: OUT_H },
    // Point the canvas at a different screen without touching the recorder
    setSource: (newScreenStream) => attach(newScreenStream),
    stop: () => {
      token++ // ends the frame-reading loop
      worker.terminate()
      stream.getTracks().forEach((t) => t.stop())
      reader?.cancel().catch(() => {})
      latest?.close()
      latest = null
      video.srcObject = null
    }
  }
}

// Records the screen exactly as the browser delivers it (no canvas, no resizing).
// Same return shape as createCanvasStream. See FORCE_1080P in config/constants.js.
export function createDirectStream(screenStream) {
  const [track] = screenStream.getVideoTracks()
  const { width, height } = track.getSettings()
  const source = { width, height }
  return { stream: new MediaStream([track]), source, out: source, stop: () => {} }
}

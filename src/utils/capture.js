// Guaranteed 1080p recording.
// Chromium's screen capture gives you the screen's native size (and won't upscale a small
// screen), so instead we draw the screen onto a fixed 1920x1080 canvas and record the canvas.
import { OUT_W, OUT_H, FPS } from '../config/constants'

// Returns { stream, source: {width, height}, out: {width, height}, stop() }
// `stream` is a 1920x1080 video-only MediaStream to give to MediaRecorder.
export async function createCanvasStream(screenStream) {
  const video = document.createElement('video')
  video.muted = true
  video.srcObject = new MediaStream(screenStream.getVideoTracks())
  await video.play()

  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const draw = () => {
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return
    // fit inside 1920x1080 without stretching (black bars only if the screen isn't 16:9)
    const scale = Math.min(OUT_W / vw, OUT_H / vh)
    const w = vw * scale
    const h = vh * scale
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, OUT_W, OUT_H)
    ctx.drawImage(video, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h)
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
    source: { width: video.videoWidth, height: video.videoHeight },
    out: { width: OUT_W, height: OUT_H },
    stop: () => {
      worker.terminate()
      stream.getTracks().forEach((t) => t.stop())
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

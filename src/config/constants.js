// App-wide settings. Change values here, not inside components.

// true: record as soon as both permissions are allowed. false: show a Start button.
export const AUTO_START = true

// Recording output. Guaranteed 1080p, see utils/capture.js
export const OUT_W = 1920
export const OUT_H = 1080
export const FPS = 30

// true: always record 1920x1080 through a canvas (see utils/capture.js).
// false: record the screen exactly as the browser gives it, which is lighter on the computer.
// If a recording freezes or stutters while you work in another window, set this to false.
export const FORCE_1080P = true

// MediaRecorder
export const RECORDER_MIME_TYPE = 'video/webm;codecs=vp9,opus'
export const VIDEO_BITS_PER_SECOND = 5_000_000 // 1080p needs more than 1.5 Mbps
export const CHUNK_INTERVAL_MS = 5000 // how often MediaRecorder hands over a chunk

// Microphone level meter
export const METER_BARS = 24

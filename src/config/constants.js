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

// ---- Google Drive upload (see src/utils/driveUploader.js) ----

// Base URL of the Experience Portal API (the same one the Trainer Portal talks to).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3002'

// Recording is sent to Drive in pieces of this size while the class is still running.
// Google requires a multiple of 256 KiB. 8 MiB is roughly 13 seconds of video at 5 Mbps.
export const DRIVE_CHUNK_BYTES = 8 * 1024 * 1024

// How long a failed upload piece is retried (network drop, laptop sleep) before giving up.
export const UPLOAD_RETRY_WINDOW_MS = 30 * 60 * 1000

// true: if RecordRoom is opened without a ticket from the Trainer Portal, still let the person
// record and fall back to the old behaviour (download to this computer). Useful for local testing.
// false: refuse to record without a ticket, so a class can never be recorded into the void.
export const ALLOW_LOCAL_ONLY = import.meta.env.VITE_ALLOW_LOCAL_ONLY === 'true'

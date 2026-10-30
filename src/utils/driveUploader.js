// Streams the recording to Google Drive WHILE the class is running.
//
// Why not collect the whole video and upload at the end?  A 2-hour class at 5 Mbps is ~4.5 GB.
// Keeping that in browser memory is fragile, and one crash would lose the whole class.
// Instead we use Drive's "resumable upload": a session is opened once, then the video is sent in
// 8 MiB pieces as MediaRecorder produces it. Only the not-yet-sent tail is ever held in memory.
//
// Flow
//   1. begin()   asks our API for a short-lived Drive token + folder (the API owns the Google
//                account; trainers never log in to Google), then opens the resumable session.
//   2. push()    called for every MediaRecorder chunk. Full 8 MiB pieces are sent immediately.
//   3. finish()  sends the last piece with the total size (which closes the Drive file), then tells
//                our API "file X is ready" so the API can copy it to YouTube and update the DB.
//
// The resumable session URL itself authorises the uploads, so the 1-hour Drive token expiring in
// the middle of a 2-hour class does not matter.
import { api } from './api'
import { DRIVE_CHUNK_BYTES, UPLOAD_RETRY_WINDOW_MS } from '../config/constants'

const DRIVE_INIT_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size'
const PENDING_KEY = 'recordroom.pendingUpload'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const fatal = (message, status) => Object.assign(new Error(message), { fatal: true, status })

// Retries `fn` with growing delays until it works, or `windowMs` has passed, or it throws a
// `fatal` error (a retry can't fix those, e.g. an expired ticket).
async function withRetry(fn, windowMs = UPLOAD_RETRY_WINDOW_MS) {
  const started = Date.now()
  let delay = 1000
  for (;;) {
    try {
      return await fn()
    } catch (err) {
      if (err.fatal || Date.now() - started > windowMs) throw err
      await sleep(delay)
      delay = Math.min(delay * 2, 30_000)
    }
  }
}

// 4xx from our API is not worth retrying (ticket expired, forbidden...), except 408/429.
const apiCall = (path, opts) =>
  api(path, opts).catch((err) => {
    if (err.status && err.status < 500 && err.status !== 408 && err.status !== 429) {
      throw fatal(err.message, err.status)
    }
    throw err
  })

// "bytes=0-8388607" -> 8388608 (how many bytes Drive has stored). null if the header is hidden/absent.
const committedFromRange = (res) => {
  const m = /bytes=0-(\d+)/.exec(res.headers.get('Range') || '')
  return m ? Number(m[1]) + 1 : null
}

const savePending = (data) => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(data))
  } catch {
    /* storage full or blocked: recovery just won't be offered */
  }
}
const clearPending = () => {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export class DriveUploader {
  constructor({ ticket, onChange }) {
    this.ticket = ticket
    this.onChange = onChange || (() => {})
    this.pending = new Blob([]) // bytes recorded but not yet stored in Drive
    this.sent = 0 // bytes stored in Drive so far
    this.sessionUri = null
    this.mimeType = 'video/webm'
    this.fileName = ''
    this.finishing = false
    this.meta = null // { durationSeconds, startedAt, endedAt } given to finish()
    this.driveFile = null
    this.pump = null
    this.state = { phase: 'preparing', sentBytes: 0, queuedBytes: 0, error: null, recording: null }
  }

  _set(patch) {
    this.state = {
      ...this.state,
      sentBytes: this.sent,
      queuedBytes: this.pending.size,
      ...patch
    }
    this.onChange(this.state)
  }

  // ---- 1. open the Drive session ----
  begin(mimeType) {
    this.mimeType = (mimeType || 'video/webm').split(';')[0]
    this.ready = this._openSession().catch((err) => {
      this._fail(err)
      throw err
    })
    this.ready.catch(() => {}) // the error is already reported through onChange
    this._set({ phase: 'preparing' })
  }

  async _openSession() {
    const info = await withRetry(() =>
      apiCall('/api/recording-room/drive-upload-token', {
        method: 'POST',
        body: { mime_type: this.mimeType },
        ticket: this.ticket
      })
    )
    this.fileName = info.file_name

    this.sessionUri = await withRetry(async () => {
      const res = await fetch(DRIVE_INIT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${info.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': this.mimeType
        },
        body: JSON.stringify({
          name: info.file_name,
          mimeType: this.mimeType,
          parents: [info.folder_id]
        })
      })
      if (!res.ok) {
        const msg = `Google Drive refused to start the upload (${res.status})`
        if (res.status < 500 && res.status !== 429) throw fatal(msg, res.status)
        throw new Error(msg)
      }
      const uri = res.headers.get('Location')
      if (!uri) throw fatal('Google Drive did not return an upload address (CORS). See README.')
      return uri
    })

    this._persist()
    this._set({ phase: 'uploading' })
    this._kick()
  }

  _persist() {
    savePending({
      sessionUri: this.sessionUri,
      sent: this.sent,
      mimeType: this.mimeType,
      fileName: this.fileName,
      ticket: this.ticket,
      savedAt: Date.now()
    })
  }

  // ---- 2. receive recorded data ----
  push(blob) {
    this.pending = new Blob([this.pending, blob])
    this._set({})
    this._kick()
  }

  // Starts the sender loop if it isn't already running
  _kick() {
    if (!this.sessionUri || this.pump || this.state.phase === 'error') return
    this.pump = this._run()
      .catch((err) => this._fail(err))
      .finally(() => {
        this.pump = null
        // data may have arrived while the loop was winding down
        if (this.pending.size >= DRIVE_CHUNK_BYTES && this.state.phase === 'uploading') this._kick()
      })
  }

  async _run() {
    for (;;) {
      if (!this.finishing && this.pending.size < DRIVE_CHUNK_BYTES) return
      const done = await withRetry(() => this._sendNext())
      if (done) return
    }
  }

  // Works out the next piece from the CURRENT state (so a retry after a partial acknowledgement
  // never resends stale data) and sends it. Returns true once Drive reports the file as complete.
  async _sendNext() {
    const isFinal = this.finishing && this.pending.size <= DRIVE_CHUNK_BYTES
    const piece = this.pending.slice(0, Math.min(this.pending.size, DRIVE_CHUNK_BYTES))
    const start = this.sent
    const total = isFinal ? start + piece.size : null
    if (isFinal && total === 0) throw fatal('Nothing was recorded.')

    const range =
      piece.size === 0
        ? `bytes */${total}`
        : `bytes ${start}-${start + piece.size - 1}/${total ?? '*'}`

    let res
    try {
      res = await fetch(this.sessionUri, {
        method: 'PUT',
        headers: { 'Content-Range': range },
        body: piece.size ? piece : undefined
      })
    } catch (err) {
      await this._resync() // network error: find out what Drive really has before retrying
      throw err
    }

    if (res.status === 200 || res.status === 201) {
      this.driveFile = await res.json()
      this.sent = total ?? this.sent + piece.size
      this.pending = new Blob([])
      return true
    }
    if (res.status === 308) {
      // "resume incomplete": Drive stored (part of) the piece and wants more
      const stored = committedFromRange(res)
      const accepted = stored === null ? piece.size : Math.max(0, Math.min(piece.size, stored - start))
      if (accepted === 0 && piece.size > 0) throw new Error('Drive stored nothing from that piece')
      this.pending = this.pending.slice(accepted)
      this.sent += accepted
      this._persist()
      this._set({})
      return false // the loop sends whatever is left, recomputing isFinal
    }
    if (res.status === 404 || res.status === 410) {
      throw fatal('The Drive upload session expired. The part already uploaded is lost.', res.status)
    }
    if (res.status < 500 && res.status !== 408 && res.status !== 429) {
      throw fatal(`Google Drive rejected the upload (${res.status})`, res.status)
    }
    await this._resync()
    throw new Error(`Drive upload failed (${res.status})`)
  }

  // Asks Drive how many bytes it has. If the browser can't read the answer, do nothing.
  async _resync() {
    try {
      const res = await fetch(this.sessionUri, {
        method: 'PUT',
        headers: { 'Content-Range': 'bytes */*' }
      })
      if (res.status !== 308) return
      const stored = committedFromRange(res)
      if (stored !== null && stored > this.sent) {
        const ahead = stored - this.sent
        this.pending = this.pending.slice(Math.min(ahead, this.pending.size))
        this.sent = stored
      }
    } catch {
      /* still offline; the caller retries */
    }
  }

  // ---- 3. close the file and register it ----
  async finish({ durationSeconds, startedAt, endedAt }) {
    this.meta = { durationSeconds, startedAt, endedAt }
    try {
      await this.ready
    } catch {
      return null
    }
    this.finishing = true
    this._set({ phase: 'finalizing' })
    // The sender loop may be idle, mid-piece, or just about to stop: kick it until Drive confirms.
    for (let i = 0; i < 3 && !this.driveFile?.id && this.state.phase !== 'error'; i++) {
      this._kick()
      if (this.pump) await this.pump
    }
    if (!this.driveFile?.id) return null
    return this._register()
  }

  async _register() {
    this._set({ phase: 'registering' })
    try {
      const recording = await register(this.ticket, this.driveFile, this.meta, this.mimeType)
      clearPending()
      this._set({ phase: 'done', recording })
      return recording
    } catch (err) {
      this._fail(err, 'register')
      return null
    }
  }

  // The Drive file is complete but the API call failed: the user can press "Try again".
  async retryRegister() {
    if (!this.driveFile?.id) return null
    this.state = { ...this.state, error: null }
    return this._register()
  }

  _fail(err, stage = 'upload') {
    this._set({ phase: 'error', error: { message: err.message, stage } })
  }

  // ---- crash recovery ----
  static pending() {
    try {
      const raw = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null')
      return raw?.sessionUri && raw.sent > 0 ? raw : null
    } catch {
      return null
    }
  }

  static discardPending() {
    clearPending()
  }

  // The tab was closed or crashed mid-class. Everything up to the last stored piece is in the open
  // Drive session; close the file at that length and register it like a normal recording.
  static async recover(pending) {
    const res = await fetch(pending.sessionUri, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes */${pending.sent}` }
    })
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`Could not close the interrupted upload (${res.status})`)
    }
    const driveFile = await res.json()
    const recording = await register(
      pending.ticket,
      driveFile,
      { durationSeconds: null, startedAt: null, endedAt: new Date().toISOString() },
      pending.mimeType
    )
    clearPending()
    return recording
  }
}

function register(ticket, driveFile, meta, mimeType) {
  return withRetry(
    () =>
      apiCall('/api/recording-room/complete', {
        method: 'POST',
        ticket,
        body: {
          drive_file_id: driveFile.id,
          mime_type: mimeType,
          duration_seconds: meta.durationSeconds,
          started_at: meta.startedAt,
          ended_at: meta.endedAt
        }
      }),
    5 * 60 * 1000
  )
}

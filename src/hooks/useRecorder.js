import { useCallback, useEffect, useRef, useState } from 'react'
import {
  OUT_W,
  OUT_H,
  VIDEO_BITS_PER_SECOND,
  CHUNK_INTERVAL_MS,
  FORCE_1080P
} from '../config/constants'
import { createCanvasStream, createDirectStream } from '../utils/capture'
import { createAudioMixer } from '../utils/audio'
import {
  getMicStream,
  getScreenStream,
  pickMimeType,
  requestAnotherScreen,
  stopStream
} from '../utils/media'
import { addChunk, finishFile, startFile } from '../utils/recordingFile'
import { DriveUploader } from '../utils/driveUploader'
import useTimer from './useTimer'

// The recording engine. Owns the streams, the MediaRecorder and the session state.
// state: permissions | recording | paused | saved | error
//
// `launch.ticket` present  -> the video is streamed to Google Drive while recording (driveUploader.js)
// `launch.ticket` missing  -> old behaviour: keep the video in memory and download it at the end
export default function useRecorder(launch = {}) {
  const ticket = launch.ticket || null
  const isDrive = !!ticket
  const [upload, setUpload] = useState(null) // progress of the Drive upload
  const uploaderRef = useRef(null)
  const startedAtRef = useRef(null)
  const [state, setState] = useState('permissions')
  const [error, setError] = useState('')
  const [savedFile, setSavedFile] = useState(null)
  const [screenLost, setScreenLost] = useState(false) // screen share ended mid-recording (e.g. Win+L)
  const screenLostRef = useRef(false)
  const [screenVersion, setScreenVersion] = useState(0) // bumps when the shared screen changes
  const [srcSize, setSrcSize] = useState(null)
  const [outSize, setOutSize] = useState({ width: OUT_W, height: OUT_H })
  const timer = useTimer()

  const mrRef = useRef(null)
  const streamsRef = useRef([])
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const mixerRef = useRef(null)
  const stopRef = useRef(null)
  const screenEndedRef = useRef(null)

  const start = async () => {
    let screen = null
    let mic = null
    try {
      setError('')
      screen = await getScreenStream()
      mic = await getMicStream()
      streamsRef.current = [screen, mic]

      const mixer = createAudioMixer(mic, screen)
      audioCtxRef.current = mixer.ctx
      mixerRef.current = mixer
      analyserRef.current = mixer.analyser

      const video = FORCE_1080P ? await createCanvasStream(screen) : createDirectStream(screen)
      canvasRef.current = video
      setSrcSize(video.source)
      setOutSize(video.out)
      console.log(
        `Screen is ${video.source.width}x${video.source.height}, recording ${video.out.width}x${video.out.height}`
      )
      const combined = new MediaStream([
        ...video.stream.getVideoTracks(),
        ...mixer.stream.getAudioTracks()
      ])

      const mimeType = pickMimeType()
      if (isDrive) {
        uploaderRef.current = new DriveUploader({ ticket, onChange: setUpload })
        uploaderRef.current.begin(mimeType)
      } else {
        startFile()
      }
      startedAtRef.current = new Date().toISOString()
      const mr = new MediaRecorder(combined, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND
      })
      mr.ondataavailable = (e) => {
        if (e.data.size === 0) return
        if (uploaderRef.current) uploaderRef.current.push(e.data)
        else addChunk(e.data)
      }
      mr.start(CHUNK_INTERVAL_MS)
      mrRef.current = mr

      // The user can also end screen sharing from the browser's own "Stop sharing" bar
      screen.getVideoTracks()[0]?.addEventListener('ended', () => screenEndedRef.current?.())

      timer.reset()
      timer.start()
      setState('recording')
    } catch (err) {
      uploaderRef.current = null
      ;[screen, mic].forEach((s) => s && stopStream(s)) // don't leave the screen being shared
      canvasRef.current?.stop()
      audioCtxRef.current?.close()
      audioCtxRef.current = null
      setError(err.message)
      setState('error')
    }
  }

  // pause / resume / stop ignore calls that don't fit the current state, so calling them twice is safe.
  const pause = () => {
    const mr = mrRef.current
    if (mr?.state !== 'recording') return
    mr.pause()
    timer.stop()
    setState('paused')
  }

  const resume = () => {
    const mr = mrRef.current
    if (mr?.state !== 'paused' || screenLostRef.current) return
    mr.resume()
    timer.start()
    setState('recording')
  }

  const stop = async () => {
    const mr = mrRef.current
    if (!mr || mr.state === 'inactive') return
    timer.stop()
    await new Promise((resolve) => {
      mr.onstop = resolve
      mr.stop()
    })
    streamsRef.current.forEach(stopStream)
    canvasRef.current?.stop()
    analyserRef.current = null
    mixerRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    const uploader = uploaderRef.current
    if (uploader) {
      // Most of the video is already in Drive. Show the "saved" screen straight away; it follows
      // the last piece going up and then the YouTube copy (see UploadCard).
      setSavedFile({ mode: 'drive', name: launch.session?.title || 'Class recording' })
      setState('saved')
      uploader.finish({
        durationSeconds: timer.seconds,
        startedAt: startedAtRef.current,
        endedAt: new Date().toISOString()
      })
      return
    }
    setSavedFile(finishFile(mr.mimeType))
    setState('saved')
  }

  // Switch to another screen / window / tab without interrupting the recording.
  // Only possible through the 1080p canvas (the recorder keeps one steady video track).
  // Must be called from a click. `win` = the window that was clicked.
  const canChangeScreen = FORCE_1080P
  const changeScreen = async (win = window) => {
    const cap = canvasRef.current
    if (!canChangeScreen || !cap?.setSource || !active) return
    let next
    try {
      next = await requestAnotherScreen(win)
    } catch {
      return // picker cancelled (or blocked): keep recording the current screen
    }
    try {
      const size = await cap.setSource(next)
      mixerRef.current?.setScreenAudio(next)
      const old = streamsRef.current[0]
      streamsRef.current = [next, streamsRef.current[1]]
      setSrcSize(size)
      next.getVideoTracks()[0]?.addEventListener('ended', () => screenEndedRef.current?.())
      stopStream(old) // stop() doesn't fire 'ended', so this won't end the recording
      setScreenVersion((v) => v + 1)
      if (screenLostRef.current) {
        // Back from a lost screen: carry on in the same recording
        screenLostRef.current = false
        setScreenLost(false)
        const mr = mrRef.current
        if (mr?.state === 'paused') {
          mr.resume()
          timer.start()
          setState('recording')
        }
      }
    } catch (err) {
      stopStream(next)
      console.warn('Could not switch screen', err)
    }
  }

  // The screen share ended by itself: the computer was locked (Win+L) or slept, or the user hit
  // the browser's "Stop sharing". Don't end the class recording; pause it and let the user
  // share a screen again. (Without the canvas pipeline we can't swap screens, so just stop.)
  const handleScreenEnded = () => {
    const mr = mrRef.current
    if (!mr || mr.state === 'inactive') return
    if (!canChangeScreen) {
      stopRef.current?.()
      return
    }
    if (mr.state === 'recording') {
      mr.pause()
      timer.stop()
    }
    screenLostRef.current = true
    setScreenLost(true)
    setState('paused')
  }

  const retryUpload = () => uploaderRef.current?.retryRegister()

  // Lets the "Stop sharing" handler above always call the latest stop()
  useEffect(() => {
    stopRef.current = stop
    screenEndedRef.current = handleScreenEnded
  })

  // Warn before the tab is closed or reloaded in the middle of a recording, or while the last
  // part of the video is still going up to Drive
  const active = state === 'recording' || state === 'paused'
  const uploading = ['preparing', 'uploading', 'finalizing', 'registering'].includes(upload?.phase)
  const guard = active || uploading
  useEffect(() => {
    if (!guard) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [guard])

  // The screen stream shown in the live preview
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getPreviewStream = useCallback(() => streamsRef.current[0] || null, [screenVersion])

  return {
    state,
    error,
    savedFile,
    srcSize,
    outSize,
    seconds: timer.seconds,
    analyserRef,
    isLive: state === 'recording',
    isPaused: state === 'paused',
    screenLost,
    isActive: active,
    isDrive,
    session: launch.session || null,
    ticket,
    upload,
    retryUpload,
    start,
    pause,
    resume,
    stop,
    canChangeScreen,
    changeScreen,
    getPreviewStream
  }
}

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
import { getMicStream, getScreenStream, pickMimeType, stopStream } from '../utils/media'
import { addChunk, finishFile, startFile } from '../utils/recordingFile'
import useTimer from './useTimer'

// The recording engine. Owns the streams, the MediaRecorder and the session state.
// state: permissions | recording | paused | saved | error
export default function useRecorder() {
  const [state, setState] = useState('permissions')
  const [error, setError] = useState('')
  const [savedFile, setSavedFile] = useState(null)
  const [srcSize, setSrcSize] = useState(null)
  const [outSize, setOutSize] = useState({ width: OUT_W, height: OUT_H })
  const timer = useTimer()

  const mrRef = useRef(null)
  const streamsRef = useRef([])
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const stopRef = useRef(null)

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

      startFile()

      const mimeType = pickMimeType()
      const mr = new MediaRecorder(combined, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND
      })
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) addChunk(e.data)
      }
      mr.start(CHUNK_INTERVAL_MS)
      mrRef.current = mr

      // The user can also end screen sharing from the browser's own "Stop sharing" bar
      screen.getVideoTracks()[0]?.addEventListener('ended', () => stopRef.current?.())

      timer.reset()
      timer.start()
      setState('recording')
    } catch (err) {
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
    if (mr?.state !== 'paused') return
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
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setSavedFile(finishFile(mr.mimeType))
    setState('saved')
  }

  // Lets the "Stop sharing" handler above always call the latest stop()
  useEffect(() => {
    stopRef.current = stop
  })

  // Warn before the tab is closed or reloaded in the middle of a recording
  const active = state === 'recording' || state === 'paused'
  useEffect(() => {
    if (!active) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])

  // The screen stream shown in the live preview
  const getPreviewStream = useCallback(() => streamsRef.current[0] || null, [])

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
    isActive: active,
    start,
    pause,
    resume,
    stop,
    getPreviewStream
  }
}

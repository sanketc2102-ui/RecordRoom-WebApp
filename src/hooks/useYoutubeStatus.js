import { useEffect, useState } from 'react'
import { api } from '../utils/api'

// After the video is registered, the API copies it from Drive to YouTube (can take a while for a
// 2-hour class). This polls until that finishes. Returns { recording_status, youtube_status, youtube_url } or null.
export default function useYoutubeStatus(ticket, sessionRecordingId, nonce = 0) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!ticket || !sessionRecordingId) return
    let stopped = false
    let timer = null

    const poll = async () => {
      try {
        const s = await api(`/api/recording-room/status/${sessionRecordingId}`, { ticket })
        if (stopped) return
        setStatus(s)
        if (s.youtube_status === 'AVAILABLE' || s.youtube_status === 'FAILED') return
      } catch {
        /* keep trying, the API may be restarting */
      }
      timer = setTimeout(poll, 10_000)
    }
    poll()

    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [ticket, sessionRecordingId, nonce])

  return status
}

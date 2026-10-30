import { useState } from 'react'
import useYoutubeStatus from '../../hooks/useYoutubeStatus'
import { api } from '../../utils/api'
import { fmt } from '../../utils/format'

const mb = (n) => (n / 1024 / 1024).toFixed(n > 1024 ** 3 ? 0 : 1)

// Shown after "Stop": follows the video's journey  Drive -> API -> YouTube.
export default function UploadCard({ recorder }) {
  const { upload, ticket, seconds, session, savedFile, retryUpload } = recorder
  const [nonce, setNonce] = useState(0)
  const recording = upload?.recording
  const yt = useYoutubeStatus(ticket, recording?.session_recording_id, nonce)

  const retryYoutube = async () => {
    await api(`/api/recording-room/complete`, {
      method: 'POST',
      ticket,
      body: { drive_file_id: recording.drive_file_id, retry: true }
    }).catch(() => {})
    setNonce((n) => n + 1)
  }

  const phase = upload?.phase || 'preparing'
  const total = (upload?.sentBytes || 0) + (upload?.queuedBytes || 0)
  const pct = total ? Math.min(100, Math.round(((upload?.sentBytes || 0) / total) * 100)) : 0

  let driveLine
  if (phase === 'error') driveLine = { tone: 'bad', text: upload.error.message }
  else if (phase === 'done' || phase === 'registering')
    driveLine = { tone: 'ok', text: `Saved to Google Drive · ${mb(upload.sentBytes)} MB` }
  else
    driveLine = {
      tone: 'busy',
      text: `Uploading the last part to Google Drive… ${mb(upload?.sentBytes || 0)} of ${mb(total)} MB (${pct}%)`
    }

  let ytLine = { tone: 'wait', text: 'YouTube: waiting for the Drive upload to finish' }
  if (recording) {
    const s = yt?.youtube_status
    if (s === 'AVAILABLE') ytLine = { tone: 'ok', text: 'Published on YouTube (unlisted)' }
    else if (s === 'FAILED')
      ytLine = { tone: 'bad', text: 'YouTube upload failed. Your video is safe in Google Drive.' }
    else ytLine = { tone: 'busy', text: 'Sending to YouTube… this can take a while for a long class' }
  }

  return (
    <section className="file-card">
      <div>
        <span className="label">Your class recording</span>
        <h2 className="file-name">{session?.title || savedFile.name}</h2>
      </div>

      <ul className="steps">
        <li data-tone={driveLine.tone}>{driveLine.text}</li>
        <li data-tone={ytLine.tone}>{ytLine.text}</li>
      </ul>

      {phase !== 'done' && phase !== 'error' && (
        <p className="file-path">Keep this tab open until the upload finishes.</p>
      )}
      {phase === 'done' && (!yt || yt.youtube_status !== 'AVAILABLE') && yt?.youtube_status !== 'FAILED' && (
        <p className="file-path">You can close this tab. YouTube will finish on its own.</p>
      )}

      <div className="stats">
        <div className="stat">
          <b>{fmt(seconds)}</b>
          <span>Length</span>
        </div>
        <div className="stat">
          <b>{session?.sessionIds?.length || 1}</b>
          <span>Session(s)</span>
        </div>
        <div className="stat">
          <b>WebM</b>
          <span>Format</span>
        </div>
      </div>

      <div className="btn-row">
        {yt?.youtube_url && (
          <a className="btn btn-ink btn-lg" href={yt.youtube_url} target="_blank" rel="noreferrer">
            Open on YouTube
          </a>
        )}
        {phase === 'error' && upload.error.stage === 'register' && (
          <button className="btn btn-coral btn-lg" onClick={retryUpload}>
            Try again
          </button>
        )}
        {yt?.youtube_status === 'FAILED' && (
          <button className="btn btn-coral btn-lg" onClick={retryYoutube}>
            Retry YouTube
          </button>
        )}
      </div>
    </section>
  )
}

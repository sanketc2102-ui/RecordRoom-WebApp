import { useState } from 'react'
import { DriveUploader } from '../../utils/driveUploader'

// Offered on the first screen when a previous recording was cut off (tab closed, browser or
// laptop crashed) before it was finished. We close the Drive file at the length already uploaded.
export default function RecoveryBanner() {
  const [pending, setPending] = useState(() => DriveUploader.pending())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!pending) return msg ? <p className="alert">{msg}</p> : null

  const finish = async () => {
    setBusy(true)
    try {
      await DriveUploader.recover(pending)
      setPending(null)
      setMsg('Done. The earlier recording was saved and is on its way to YouTube.')
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }
  const discard = () => {
    DriveUploader.discardPending()
    setPending(null)
  }

  return (
    <div className="alert" role="alert">
      <p>
        A recording was interrupted ({(pending.sent / 1024 / 1024).toFixed(0)} MB had already reached
        Google Drive). Save what was uploaded?
      </p>
      {msg && <p>{msg}</p>}
      <div className="btn-row">
        <button className="btn btn-ink" onClick={finish} disabled={busy}>
          {busy ? 'Saving…' : 'Save it'}
        </button>
        <button className="btn btn-soft" onClick={discard} disabled={busy}>
          Discard
        </button>
      </div>
    </div>
  )
}

import { OUT_W, OUT_H } from '../../config/constants'
import { downloadFile } from '../../utils/recordingFile'
import { fmt } from '../../utils/format'
import { DownloadIcon, RecordIcon } from '../icons'

export default function FileCard({ file, seconds, outSize, onRecordAgain }) {
  const out = outSize || { width: OUT_W, height: OUT_H }

  return (
    <section className="file-card">
      <div>
        <span className="label">Your video</span>
        <h2 className="file-name">{file.name}</h2>
      </div>
      <p className="file-path">Downloads folder · {(file.size / 1024 / 1024).toFixed(1)} MB</p>
      <div className="stats">
        <div className="stat">
          <b>{fmt(seconds)}</b>
          <span>Length</span>
        </div>
        <div className="stat">
          <b>
            {out.width}×{out.height}
          </b>
          <span>Quality</span>
        </div>
        <div className="stat">
          <b>{file.format}</b>
          <span>Format</span>
        </div>
      </div>
      <div className="btn-row">
        <button className="btn btn-ink btn-lg" onClick={() => downloadFile(file)}>
          <DownloadIcon size={18} /> Download again
        </button>
        <button className="btn btn-soft btn-lg" onClick={onRecordAgain}>
          <RecordIcon size={18} /> Record again
        </button>
      </div>
    </section>
  )
}

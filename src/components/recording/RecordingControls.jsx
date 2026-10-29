import { PauseIcon, PlayIcon, StopIcon } from '../icons'

export default function RecordingControls({ isLive, onPause, onResume, onStop }) {
  return (
    <div className="controls">
      {isLive ? (
        <button className="btn btn-purple btn-lg" onClick={onPause}>
          <PauseIcon size={18} /> Pause
        </button>
      ) : (
        <button className="btn btn-yellow btn-lg" onClick={onResume}>
          <PlayIcon size={18} /> Resume
        </button>
      )}
      <button className="btn btn-coral btn-lg" onClick={onStop}>
        <StopIcon size={18} /> Stop and save
      </button>
    </div>
  )
}

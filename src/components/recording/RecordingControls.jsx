import { PauseIcon, PlayIcon, ScreenIcon, StopIcon } from '../icons'

export default function RecordingControls({ isLive, onPause, onResume, onStop, onMinimize, onChangeScreen, screenLost }) {
  return (
    <div className="controls">
      {screenLost ? (
        <button className="btn btn-yellow btn-lg btn-wide" onClick={() => onChangeScreen()}>
          <PlayIcon size={18} /> Resume (share screen)
        </button>
      ) : isLive ? (
        <button className="btn btn-purple btn-lg" onClick={onPause}>
          <PauseIcon size={18} /> Pause
        </button>
      ) : (
        <button className="btn btn-yellow btn-lg" onClick={onResume}>
          <PlayIcon size={18} /> Resume
        </button>
      )}
      {onChangeScreen && !screenLost && (
        <button className="btn btn-soft btn-lg" onClick={() => onChangeScreen()}>
          <ScreenIcon size={18} /> Change screen
        </button>
      )}
      <button className="btn btn-coral btn-lg" onClick={onStop}>
        <StopIcon size={18} /> Stop and save
      </button>
      {onMinimize && (
        <button className="btn btn-soft btn-minimize" onClick={onMinimize}>
          Minimize
        </button>
      )}
    </div>
  )
}

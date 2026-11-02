import { createPortal } from 'react-dom'
import { fmt } from '../../utils/format'
import { PauseIcon, PlayIcon, ScreenIcon, StopIcon } from '../icons'

// Self-contained styles: the floating window is a separate document and doesn't inherit ours.
const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #1b1b22; color: #fff; }
  .mini { display: flex; align-items: center; gap: 12px; height: 100vh; padding: 0 14px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #ff4d4f; flex: none;
         animation: pulse 1.2s ease-in-out infinite; }
  .dot.paused { background: #f5b800; animation: none; }
  .time { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; flex: 1; }
  .label { font-size: 11px; opacity: .65; display: block; font-weight: 500; }
  button { flex: none; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 8px;
           padding: 8px 10px; font: inherit; font-size: 13px; font-weight: 600; color: #fff;
           cursor: pointer; }
  .pause { background: #6b4eff; }
  .resume { background: #f5b800; color: #222; }
  .stop { background: #e5484d; }
  .swap { background: #3a3a46; }
  .mini { min-width: 0; }
  .time { min-width: 0; white-space: nowrap; overflow: hidden; }
  @keyframes pulse { 50% { opacity: .35; } }
  /* Narrow: drop the "Stop" word and the label, keep icons */
  @media (max-width: 340px) {
    .mini { gap: 8px; padding: 0 8px; }
    .time { font-size: 18px; }
    .label, .stop-text { display: none; }
    button { padding: 8px; }
  }
  /* Very narrow: stack timer above the buttons */
  @media (max-width: 170px) {
    .mini { flex-wrap: wrap; justify-content: center; align-content: center; gap: 6px; }
    .time { flex: 1 1 100%; text-align: center; }
  }
  /* Tall: bigger, roomier layout */
  @media (min-height: 160px) {
    .time { font-size: 32px; }
    .label { font-size: 13px; }
    button { padding: 12px 14px; font-size: 15px; }
  }
`

export default function MiniController({ pipWindow, isLive, seconds, onPause, onResume, onStop, onChangeScreen, screenLost }) {
  if (!pipWindow) return null

  return createPortal(
    <div className="mini">
      <style>{CSS}</style>
      <span className={`dot ${isLive ? '' : 'paused'}`} />
      <span className="time">
        <span className="label">{screenLost ? 'Screen lost' : isLive ? 'Recording' : 'Paused'}</span>
        {fmt(seconds)}
      </span>
      {screenLost ? null : isLive ? (
        <button className="pause" onClick={onPause} title="Pause">
          <PauseIcon size={14} />
        </button>
      ) : (
        <button className="resume" onClick={onResume} title="Resume">
          <PlayIcon size={14} />
        </button>
      )}
      {onChangeScreen && (
        <button
          className={screenLost ? 'resume' : 'swap'}
          onClick={() => onChangeScreen(pipWindow)}
          title={screenLost ? 'Share your screen again to resume' : 'Change screen'}
        >
          {screenLost ? <PlayIcon size={14} /> : <ScreenIcon size={14} />}
          {screenLost && <span>Resume</span>}
        </button>
      )}
      <button className="stop" onClick={() => onStop(pipWindow)} title="Stop and save">
        <StopIcon size={14} /> <span className="stop-text">Stop</span>
      </button>
    </div>,
    pipWindow.document.body
  )
}

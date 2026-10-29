import Clock from '../ui/Clock'
import MicMeter from '../ui/MicMeter'

export default function ClockCard({ isLive, isPaused, seconds, analyserRef }) {
  return (
    <div className="clock-card">
      <div className="live">
        <span className={`live-dot ${isPaused ? 'is-paused' : ''}`} />
        {isLive ? 'Recording' : 'Paused'}
      </div>
      <Clock seconds={seconds} paused={isPaused} />
      <div className="meter-wrap">
        <MicMeter analyserRef={analyserRef} active={isLive} />
        <span className="meter-label">Microphone level</span>
      </div>
    </div>
  )
}

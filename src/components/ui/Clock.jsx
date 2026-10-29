import { fmt } from '../../utils/format'

// Fixed-width digits so the clock never jitters as numbers change
export default function Clock({ seconds, paused }) {
  return (
    <div
      className={`clock ${paused ? 'is-paused' : ''}`}
      role="timer"
      aria-label={`Elapsed time ${fmt(seconds)}`}
    >
      {fmt(seconds)
        .split('')
        .map((c, i) =>
          c === ':' ? (
            <span key={i} className="colon">
              :
            </span>
          ) : (
            <span key={i} className="digit">
              {c}
            </span>
          )
        )}
    </div>
  )
}

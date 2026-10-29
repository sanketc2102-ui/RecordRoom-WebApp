const CHIP_LABELS = {
  recording: 'Recording',
  paused: 'Paused',
  saved: 'Saved',
  error: 'Needs attention'
}

export default function TopBar({ state, permissionsReady }) {
  const label = state === 'permissions' ? `Setup ${permissionsReady} of 2` : CHIP_LABELS[state]

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" aria-hidden="true" />
        RecordRoom
      </div>
      <span className="chip">
        <span className={`chip-dot ${state === 'recording' ? 'is-live' : ''}`} />
        {label}
      </span>
    </header>
  )
}

import { CheckIcon } from '../icons'

export default function PermissionTile({ icon, tone, title, text, ok, label, doneLabel, onClick }) {
  return (
    <section className={`perm ${ok ? 'is-ok' : ''}`} data-tone={tone}>
      <div className="perm-icon">{ok ? <CheckIcon /> : icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <button className={`btn ${ok ? 'btn-ok' : 'btn-ink'}`} onClick={onClick} disabled={ok}>
        {ok ? doneLabel : label}
      </button>
    </section>
  )
}

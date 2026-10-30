// The Trainer Portal opens RecordRoom with a short-lived "ticket" in the URL fragment:
//   http://localhost:5174/#ticket=<jwt>
// A fragment is never sent to a server and doesn't show up in access logs. We read it once, keep it
// in sessionStorage (so a reload of this tab still works) and remove it from the address bar.
const KEY = 'recordroom.ticket'

const decodePayload = (jwt) => {
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(b64))))
  } catch {
    return null
  }
}

export function readLaunch() {
  let ticket = null
  const m = window.location.hash.match(/ticket=([^&]+)/)
  if (m) {
    ticket = decodeURIComponent(m[1])
    try {
      sessionStorage.setItem(KEY, ticket)
    } catch {
      /* private mode etc. - the ticket just won't survive a reload */
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  } else {
    try {
      ticket = sessionStorage.getItem(KEY)
    } catch {
      ticket = null
    }
  }

  const payload = ticket ? decodePayload(ticket) : null
  const expired = payload?.exp ? payload.exp * 1000 < Date.now() : false
  if (!payload || expired) return { ticket: null, session: null, expired: !!payload && expired }

  return {
    ticket,
    expired: false,
    session: {
      meetingId: payload.meeting_id,
      title: payload.title || 'Class session',
      sessionIds: payload.cohort_session_ids || []
    }
  }
}

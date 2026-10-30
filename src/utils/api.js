import { API_BASE_URL } from '../config/constants'

// Calls the Experience Portal API with the recording ticket. The API wraps results as { data }.
export async function api(path, { method = 'GET', body, ticket } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ticket}`
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.message || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return json.data
}

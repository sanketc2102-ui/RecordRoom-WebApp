import { useEffect } from 'react'
import { fmt } from '../utils/format'

// Shows the recording status in the browser tab, so you can see it from another tab.
export default function useTabTitle({ state, seconds, screenLost }) {
  useEffect(() => {
    document.title = screenLost
      ? '⚠ Share screen again · RecordRoom'
      : state === 'recording'
        ? `● ${fmt(seconds)} · RecordRoom`
        : state === 'paused'
          ? 'Paused · RecordRoom'
          : 'RecordRoom'
  }, [state, seconds, screenLost])
}

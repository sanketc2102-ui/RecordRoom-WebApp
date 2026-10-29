import { useEffect } from 'react'
import { fmt } from '../utils/format'

// Shows the recording status in the browser tab, so you can see it from another tab.
export default function useTabTitle({ state, seconds }) {
  useEffect(() => {
    document.title =
      state === 'recording'
        ? `● ${fmt(seconds)} · RecordRoom`
        : state === 'paused'
          ? 'Paused · RecordRoom'
          : 'RecordRoom'
  }, [state, seconds])
}

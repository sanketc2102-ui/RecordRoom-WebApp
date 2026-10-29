import { useEffect, useRef } from 'react'
import { AUTO_START } from '../config/constants'

// Starts recording once, as soon as every permission is allowed (if AUTO_START is on)
export default function useAutoStart({ permissionsGranted, state, start }) {
  const startedRef = useRef(false)

  useEffect(() => {
    if (AUTO_START && permissionsGranted && state === 'permissions' && !startedRef.current) {
      startedRef.current = true
      start()
    }
  }, [permissionsGranted, state, start])
}

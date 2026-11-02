import { useMemo } from 'react'
import { ALLOW_LOCAL_ONLY } from './config/constants'
import { readLaunch } from './utils/launchParams'
import usePermissions from './hooks/usePermissions'
import useRecorder from './hooks/useRecorder'
import useAutoStart from './hooks/useAutoStart'
import useTabTitle from './hooks/useTabTitle'
import useWakeLock from './hooks/useWakeLock'
import useScreenAlerts from './hooks/useScreenAlerts'
import TopBar from './components/layout/TopBar'
import RecoveryBanner from './components/saved/RecoveryBanner'
import PermissionsScreen from './screens/PermissionsScreen'
import RecordingScreen from './screens/RecordingScreen'
import SavedScreen from './screens/SavedScreen'
import ErrorScreen from './screens/ErrorScreen'
import NoTicketScreen from './screens/NoTicketScreen'

export default function App() {
  // The Trainer Portal opens this page as  /#ticket=...  (read once, see utils/launchParams.js)
  const launch = useMemo(() => readLaunch(), [])

  // No ticket: we don't know which class this is, so don't record into the void.
  if (!launch.ticket && !ALLOW_LOCAL_ONLY) {
    return (
      <div className="app" data-state="permissions">
        <TopBar state="error" permissionsReady={0} />
        <RecoveryBanner />
        <NoTicketScreen expired={launch.expired} />
      </div>
    )
  }
  return <Room launch={launch} />
}

function Room({ launch }) {
  const permissions = usePermissions()
  const recorder = useRecorder(launch)

  useAutoStart({
    permissionsGranted: permissions.allGranted,
    state: recorder.state,
    start: recorder.start
  })
  useTabTitle(recorder)
  useWakeLock(recorder.isActive)
  useScreenAlerts({ active: recorder.isActive, screenLost: recorder.screenLost })

  return (
    <div className="app" data-state={recorder.state}>
      <TopBar state={recorder.state} permissionsReady={permissions.ready} />

      {recorder.state === 'permissions' && (
        <>
          <RecoveryBanner />
          <PermissionsScreen
            permissions={permissions}
            onStart={recorder.start}
            session={launch.session}
          />
        </>
      )}
      {recorder.isActive && <RecordingScreen recorder={recorder} />}
      {recorder.state === 'saved' && <SavedScreen recorder={recorder} />}
      {recorder.state === 'error' && <ErrorScreen recorder={recorder} />}
    </div>
  )
}

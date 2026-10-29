import usePermissions from './hooks/usePermissions'
import useRecorder from './hooks/useRecorder'
import useAutoStart from './hooks/useAutoStart'
import useTabTitle from './hooks/useTabTitle'
import TopBar from './components/layout/TopBar'
import PermissionsScreen from './screens/PermissionsScreen'
import RecordingScreen from './screens/RecordingScreen'
import SavedScreen from './screens/SavedScreen'
import ErrorScreen from './screens/ErrorScreen'

export default function App() {
  const permissions = usePermissions()
  const recorder = useRecorder()

  useAutoStart({
    permissionsGranted: permissions.allGranted,
    state: recorder.state,
    start: recorder.start
  })
  useTabTitle(recorder)

  return (
    <div className="app" data-state={recorder.state}>
      <TopBar state={recorder.state} permissionsReady={permissions.ready} />

      {recorder.state === 'permissions' && (
        <PermissionsScreen permissions={permissions} onStart={recorder.start} />
      )}
      {recorder.isActive && <RecordingScreen recorder={recorder} />}
      {recorder.state === 'saved' && <SavedScreen recorder={recorder} />}
      {recorder.state === 'error' && <ErrorScreen recorder={recorder} />}
    </div>
  )
}

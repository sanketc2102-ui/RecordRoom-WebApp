import { AUTO_START } from '../config/constants'
import Hero from '../components/ui/Hero'
import PermissionTile from '../components/ui/PermissionTile'
import { MicIcon, ScreenIcon, RecordIcon } from '../components/icons'

export default function PermissionsScreen({ permissions, onStart, session }) {
  const { micOk, screenOk, permError, allowMic, allowScreen, ready } = permissions

  return (
    <main className="view split">
      <Hero tone="yellow">
        <h1 className="display">{session ? session.title : 'Set up your recording'}</h1>
        <p className="lede">
          Allow your microphone and screen. Recording starts as soon as both are on.{' '}
          {session
            ? 'The video is uploaded to Google Drive while you teach, then published to YouTube.'
            : 'The video is saved on this computer.'}
        </p>
      </Hero>

      <section className="checklist">
        <div
          className="progress"
          role="progressbar"
          aria-label="Permissions allowed"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={ready}
        >
          <span className={ready >= 1 ? 'on' : ''} />
          <span className={ready >= 2 ? 'on' : ''} />
        </div>

        <PermissionTile
          tone="purple"
          icon={<MicIcon />}
          title="Microphone"
          text="Captures your voice during the session."
          ok={micOk}
          label="Allow microphone"
          doneLabel="Allowed"
          onClick={allowMic}
        />
        <PermissionTile
          tone="coral"
          icon={<ScreenIcon />}
          title="Screen recording"
          text="Pick a screen, window or tab to record."
          ok={screenOk}
          label="Allow screen"
          doneLabel="Allowed"
          onClick={allowScreen}
        />

        {permError && (
          <p className="alert" role="alert">
            {permError}
          </p>
        )}

        {!AUTO_START && micOk && screenOk && (
          <button className="btn btn-coral btn-lg" onClick={onStart}>
            <RecordIcon size={20} /> Start recording
          </button>
        )}
      </section>
    </main>
  )
}

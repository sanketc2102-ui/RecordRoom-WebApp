import LivePreview from '../components/recording/LivePreview'
import ClockCard from '../components/recording/ClockCard'
import RecordingControls from '../components/recording/RecordingControls'
import MiniController from '../components/recording/MiniController'
import useMiniController from '../hooks/useMiniController'

export default function RecordingScreen({ recorder }) {
  const { isLive, isPaused, seconds, srcSize, outSize, analyserRef, getPreviewStream } = recorder
  const mini = useMiniController({ auto: true })

  // Shared by the main Stop button and the floating one. `win` is the window to show the
  // confirm in (the floating window when stopping from there).
  const handleStop = (win = window) => {
    // A class has one recording. Make an accidental click harmless.
    if (!recorder.isDrive || win.confirm('End the class recording? This cannot be undone.')) {
      recorder.stop()
    }
  }

  return (
    <main className="view stage">
      <LivePreview
        isLive={isLive}
        isPaused={isPaused}
        srcSize={srcSize}
        outSize={outSize}
        getPreviewStream={getPreviewStream}
      />

      <aside className="console">
        <ClockCard
          isLive={isLive}
          isPaused={isPaused}
          seconds={seconds}
          analyserRef={analyserRef}
        />

        {recorder.screenLost && (
          <p className="note" role="alert">
            Screen sharing stopped (the screen was locked, or sharing was ended). The recording is
            paused. Share a screen again to continue the same recording.
          </p>
        )}

        <dl className="facts">
          <div className="fact">
            <dt>Source</dt>
            <dd>Your chosen screen and mic</dd>
          </div>
          <div className="fact">
            <dt>Saves to</dt>
            <dd>{recorder.isDrive ? 'Google Drive, then YouTube' : 'Your Downloads folder'}</dd>
          </div>
        </dl>

        <RecordingControls
          isLive={isLive}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onStop={() => handleStop()}
          onMinimize={mini.supported && !mini.isOpen ? mini.open : undefined}
          onChangeScreen={recorder.canChangeScreen ? recorder.changeScreen : undefined}
          screenLost={recorder.screenLost}
        />
      </aside>

      <MiniController
        pipWindow={mini.pipWindow}
        isLive={isLive}
        seconds={seconds}
        onPause={recorder.pause}
        onResume={recorder.resume}
        onStop={handleStop}
        onChangeScreen={recorder.canChangeScreen ? recorder.changeScreen : undefined}
        screenLost={recorder.screenLost}
      />
    </main>
  )
}

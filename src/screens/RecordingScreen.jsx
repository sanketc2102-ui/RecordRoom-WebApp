import LivePreview from '../components/recording/LivePreview'
import ClockCard from '../components/recording/ClockCard'
import RecordingControls from '../components/recording/RecordingControls'

export default function RecordingScreen({ recorder }) {
  const { isLive, isPaused, seconds, srcSize, outSize, analyserRef, getPreviewStream } = recorder

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
          onStop={() => {
            // A class has one recording. Make an accidental click harmless.
            if (!recorder.isDrive || window.confirm('End the class recording? This cannot be undone.')) {
              recorder.stop()
            }
          }}
        />
      </aside>
    </main>
  )
}

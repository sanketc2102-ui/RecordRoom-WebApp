// Mixes the microphone and (if present) the system audio into one track.
// Also returns an analyser on the mic so the UI can show a level meter.
// Returns { ctx, analyser, stream }. Close `ctx` when the recording ends.
export function createAudioMixer(micStream, screenStream) {
  const ctx = new AudioContext()
  const dest = ctx.createMediaStreamDestination()
  const micSource = ctx.createMediaStreamSource(micStream)
  micSource.connect(dest)

  // Listen to the mic (not connected to speakers) to drive the level meter
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  micSource.connect(analyser)

  // The system / tab sound can be swapped later (when the user changes the shared screen)
  let screenSource = null
  const setScreenAudio = (stream) => {
    screenSource?.disconnect()
    screenSource = null
    if (stream && stream.getAudioTracks().length > 0) {
      screenSource = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()))
      screenSource.connect(dest)
    }
  }
  setScreenAudio(screenStream)

  return { ctx, analyser, stream: dest.stream, setScreenAudio }
}

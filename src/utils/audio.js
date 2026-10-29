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

  if (screenStream.getAudioTracks().length > 0) {
    ctx.createMediaStreamSource(new MediaStream(screenStream.getAudioTracks())).connect(dest)
  }

  return { ctx, analyser, stream: dest.stream }
}

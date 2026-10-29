// Posts a message every `ms` milliseconds. Used as a clock that keeps running in the background.
self.onmessage = (e) => {
  setInterval(() => self.postMessage(0), e.data)
}

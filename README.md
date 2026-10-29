# RecordRoom (web)

Record your screen and microphone in the browser. React + Vite, no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # try the built site locally
```

Screen capture only works on `localhost` or over **https**. Use Chrome or Edge on a computer.

## How it behaves

- You pick the screen, window or tab in the browser's own picker.
- System sound is only recorded if you tick "Share audio" in the picker (Chrome / Edge; whole-screen
  sound works on Windows only). The microphone is always recorded.
- When you stop, the video downloads to the browser's Downloads folder.
- The tab title shows the timer, so you can see the status from another tab.
- Closing the tab while recording shows a warning.

## Settings

`src/config/constants.js`

- `AUTO_START`: start recording as soon as both permissions are allowed.
- `FORCE_1080P`: record at 1920x1080 through a canvas. If a recording freezes or stutters while
  you work in another window, set it to `false` to record the screen as-is.
- `FPS`, `VIDEO_BITS_PER_SECOND`, `CHUNK_INTERVAL_MS`: recording quality.

## Where things are

- `src/utils/media.js`: microphone, screen picker, recording format.
- `src/utils/capture.js`: the 1080p canvas.
- `src/utils/recordingFile.js`: collects chunks and downloads the file. This is the one place to
  change when videos should go to Google Drive or YouTube instead of the Downloads folder.
- `src/hooks/useRecorder.js`: the recording engine.

## Hosting

Upload the `dist/` folder to any web server over https. Set a Content-Security-Policy header on
the server if you need one. If the app is shown inside an `<iframe>` on another site, the iframe
needs `allow="display-capture; microphone"`.

import Hero from '../components/ui/Hero'
import FileCard from '../components/saved/FileCard'
import UploadCard from '../components/saved/UploadCard'
import { CheckIcon } from '../components/icons'
import { fmt } from '../utils/format'

export default function SavedScreen({ recorder }) {
  const { savedFile, seconds, outSize, start } = recorder

  return (
    <main className="view split">
      <Hero tone="purple">
        <span className="badge">
          <CheckIcon size={30} strokeWidth={3} />
        </span>
        <div className="hero-copy">
          <h1 className="display">{recorder.isDrive ? 'Class recorded' : 'Session saved'}</h1>
          <p className="lede">
            You recorded {fmt(seconds)}.{' '}
            {recorder.isDrive
              ? 'The video is going to Google Drive and then YouTube.'
              : 'The video was saved to your Downloads folder.'}
          </p>
        </div>
      </Hero>

      {recorder.isDrive ? (
        <UploadCard recorder={recorder} />
      ) : (
        <FileCard file={savedFile} seconds={seconds} outSize={outSize} onRecordAgain={start} />
      )}
    </main>
  )
}

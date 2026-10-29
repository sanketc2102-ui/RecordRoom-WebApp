import Hero from '../components/ui/Hero'

export default function ErrorScreen({ recorder }) {
  return (
    <main className="view">
      <Hero tone="coral">
        <div className="hero-copy">
          <h1 className="display">Recording didn’t start</h1>
          <p className="lede">{recorder.error || 'Something unexpected happened.'}</p>
          <div className="btn-row">
            <button className="btn btn-ink btn-lg" onClick={recorder.start}>
              Try again
            </button>
          </div>
        </div>
      </Hero>
    </main>
  )
}

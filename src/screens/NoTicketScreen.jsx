import Hero from '../components/ui/Hero'

export default function NoTicketScreen({ expired }) {
  return (
    <main className="view split">
      <Hero tone="coral">
        <h1 className="display">{expired ? 'This recording link has expired' : 'Start from the Trainer Portal'}</h1>
        <p className="lede">
          {expired
            ? 'Go back to the Trainer Portal, open today’s session and press Start recording again.'
            : 'RecordRoom needs to know which session you are recording. Open the Trainer Portal, choose your session and press Start recording. This page opens by itself.'}
        </p>
      </Hero>
    </main>
  )
}

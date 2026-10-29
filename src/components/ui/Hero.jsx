export default function Hero({ tone, children }) {
  return (
    <section className="hero" data-tone={tone}>
      <span className="hero-art" aria-hidden="true" />
      {children}
    </section>
  )
}

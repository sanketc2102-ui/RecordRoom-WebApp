import { useEffect, useRef } from 'react'
import { METER_BARS } from '../../config/constants'

// Live microphone level so trainers can see at a glance that their voice is being captured
export default function MicMeter({ analyserRef, active }) {
  const barsRef = useRef([])

  useEffect(() => {
    const bars = barsRef.current
    const clear = () => bars.forEach((b) => b && b.classList.remove('on'))
    const analyser = analyserRef.current
    if (!active || !analyser) {
      clear()
      return
    }
    const buf = new Uint8Array(analyser.fftSize)
    let smooth = 0
    let raf
    const loop = () => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const level = Math.min(1, Math.sqrt(sum / buf.length) * 4)
      smooth = Math.max(level, smooth * 0.88)
      const lit = Math.round(smooth * METER_BARS)
      bars.forEach((b, i) => b && b.classList.toggle('on', i < lit))
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      clear()
    }
  }, [active, analyserRef])

  return (
    <div className="meter" aria-hidden="true">
      {Array.from({ length: METER_BARS }, (_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className={i > METER_BARS * 0.8 ? 'hot' : i > METER_BARS * 0.6 ? 'warm' : ''}
          style={{ '--i': i }}
        />
      ))}
    </div>
  )
}

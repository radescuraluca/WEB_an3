import { useEffect, useRef } from 'react'

// Grafic pe <canvas> desenat manual, fără biblioteci
function drawChart(canvas, data, theme) {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!data || width === 0 || data.temps.length < 2) return

  // Claritate pe ecrane de înaltă rezoluție
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const muted = theme === 'dark' ? '#94a3b8' : '#64748b'
  const pad = { top: 26, right: 14, bottom: 26, left: 14 }
  const w = width - pad.left - pad.right
  const h = height - pad.top - pad.bottom
  const n = data.temps.length
  const step = w / n

  const min = Math.min(...data.temps) - 1
  const max = Math.max(...data.temps) + 1
  const x = (i) => pad.left + step * i + step / 2
  const y = (t) => pad.top + h - ((t - min) / (max - min)) * h * 0.85

  ctx.clearRect(0, 0, width, height)
  ctx.font = '600 11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'

  // Bare: șanse de precipitații
  ctx.fillStyle = 'rgba(14, 165, 233, 0.35)'
  data.rain.forEach((p, i) => {
    const barH = (p / 100) * h
    if (barH > 0) ctx.fillRect(x(i) - step * 0.3, pad.top + h - barH, step * 0.6, barH)
  })

  // Zona de sub linia temperaturii
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + h)
  gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)')
  gradient.addColorStop(1, 'rgba(245, 158, 11, 0)')
  ctx.beginPath()
  ctx.moveTo(x(0), pad.top + h)
  data.temps.forEach((t, i) => ctx.lineTo(x(i), y(t)))
  ctx.lineTo(x(n - 1), pad.top + h)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  // Linia temperaturii
  ctx.beginPath()
  data.temps.forEach((t, i) => (i === 0 ? ctx.moveTo(x(i), y(t)) : ctx.lineTo(x(i), y(t))))
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.stroke()

  // Etichete: temperatură și oră
  const every = width < 520 ? 4 : 3
  data.temps.forEach((t, i) => {
    if (i % every !== 0) return
    ctx.beginPath()
    ctx.arc(x(i), y(t), 3.5, 0, Math.PI * 2)
    ctx.fillStyle = '#f59e0b'
    ctx.fill()

    ctx.fillStyle = muted
    ctx.fillText(`${Math.round(t)}°`, x(i), y(t) - 10)
    ctx.fillText(i === 0 ? 'Acum' : data.hours[i], x(i), height - 6)
  })
}

function Chart({ data, theme }) {
  const canvasRef = useRef(null)

  // Redesenăm când se schimbă datele, tema sau mărimea ferestrei
  useEffect(() => {
    const canvas = canvasRef.current
    drawChart(canvas, data, theme)

    let timer
    function handleResize() {
      clearTimeout(timer)
      timer = setTimeout(() => drawChart(canvas, data, theme), 150)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [data, theme])

  return (
    <figure className="chart">
      <canvas
        id="chart"
        ref={canvasRef}
        role="img"
        aria-label="Grafic: temperatura și probabilitatea de precipitații pe următoarele 24 de ore"
      />
      <figcaption>
        <span className="legend legend-temp">Temperatură</span>
        <span className="legend legend-rain">Șanse de precipitații</span>
      </figcaption>
    </figure>
  )
}

export default Chart

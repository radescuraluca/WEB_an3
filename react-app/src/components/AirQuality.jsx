import { AQI_LEVELS } from '../weather'

function AirQuality({ air }) {
  const c = air && air.current

  let content
  if (!c || c.european_aqi == null) {
    content = <p className="muted">Datele despre calitatea aerului nu sunt disponibile pentru această locație.</p>
  } else {
    const aqi = Math.round(c.european_aqi)
    const level = AQI_LEVELS.find((l) => aqi <= l.max)

    const pollutants = [
      ['PM2.5', c.pm2_5, 'particule fine'],
      ['PM10', c.pm10, 'particule'],
      ['NO₂', c.nitrogen_dioxide, 'dioxid de azot'],
      ['O₃', c.ozone, 'ozon'],
    ]

    content = (
      <>
        <div className="aqi-head">
          <span className="aqi-value" style={{ color: level.color }}>{aqi}</span>
          <span className="aqi-label">{level.label}</span>
          <span className="muted">indice european</span>
        </div>

        <div className="aqi-scale">
          <span className="aqi-marker" style={{ left: `${Math.min(aqi, 100)}%` }} />
        </div>

        <ul className="pollutants">
          {pollutants.map(([name, value, note]) => (
            <li key={name} className="pollutant">
              <strong>{value == null ? '–' : `${Math.round(value)} µg/m³`}</strong>
              <span>{name} · {note}</span>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <section className="card" aria-labelledby="air-title">
      <h2 id="air-title" className="card-title">🍃 Calitatea aerului</h2>
      <div className="air">{content}</div>
    </section>
  )
}

export default AirQuality

import { timeOf, uvLevel, windDirection } from '../weather'

function Details({ weather, units }) {
  const c = weather.current
  const uv = weather.daily.uv_index_max[0]

  const items = [
    ['💧 Umiditate', `${c.relative_humidity_2m}%`],
    ['💨 Vânt', `${Math.round(c.wind_speed_10m)} ${units.wind}`, `dinspre ${windDirection(c.wind_direction_10m)}`],
    ['🌡️ Presiune', `${Math.round(c.surface_pressure)} hPa`],
    ['☁️ Nori', `${c.cloud_cover}%`],
    ['🔆 Indice UV', uv == null ? '–' : uv.toFixed(1), uvLevel(uv)],
    ['🌧️ Precipitații', `${c.precipitation} mm`, 'în ultima oră'],
    ['🌅 Răsărit', timeOf(weather.daily.sunrise[0])],
    ['🌇 Apus', timeOf(weather.daily.sunset[0])],
  ]

  return (
    <section id="detalii" className="card" aria-labelledby="details-title">
      <h2 id="details-title" className="card-title">📊 Detalii</h2>
      <dl className="details">
        {items.map(([label, value, note]) => (
          <div key={label} className="detail">
            <dt>{label}</dt>
            <dd>
              {value}
              {note && <small>{note}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default Details

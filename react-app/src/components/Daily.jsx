import { dayName, weatherInfo } from '../weather'

function Daily({ daily, units }) {
  const count = daily.time.length
  const lowest = Math.min(...daily.temperature_2m_min)
  const highest = Math.max(...daily.temperature_2m_max)
  const span = highest - lowest || 1

  return (
    <section className="card" aria-labelledby="daily-title">
      <h2 id="daily-title" className="card-title">📅 Prognoza pe {count} zile</h2>

      <ul className="daily">
        {daily.time.map((date, i) => {
          const min = daily.temperature_2m_min[i]
          const max = daily.temperature_2m_max[i]
          const { desc, icon } = weatherInfo(daily.weather_code[i])
          const rain = daily.precipitation_probability_max[i]

          // Bara arată intervalul de temperatură al zilei față de toată perioada
          const fillStyle = {
            left: `${((min - lowest) / span) * 100}%`,
            width: `${Math.max(((max - min) / span) * 100, 4)}%`,
          }

          return (
            <li key={date} className="day" title={desc} style={{ animationDelay: `${i * 30}ms` }}>
              <span className="day-name">{dayName(date, i)}</span>
              <span className="day-icon" aria-label={desc}>{icon}</span>
              <span className="day-min">{Math.round(min)}{units.temp}</span>
              <div className="range">
                <div className="range-fill" style={fillStyle} />
              </div>
              <span className="day-max">{Math.round(max)}{units.temp}</span>
              <span className="day-rain">{rain ? `💧${rain}%` : ''}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default Daily

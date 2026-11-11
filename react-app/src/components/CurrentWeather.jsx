import { placeLabel, timeOf, weatherInfo } from '../weather'

function CurrentWeather({ place, weather, units, isFavorite, onToggleFavorite }) {
  const c = weather.current
  const today = weather.daily
  const { desc, icon } = weatherInfo(c.weather_code, c.is_day === 1)

  const date = new Date(`${c.time.slice(0, 10)}T12:00`).toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const favLabel = isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'

  return (
    <article className="current">
      <div className="current-top">
        <div>
          <h2 className="location">{placeLabel(place)}</h2>
          <p className="location-time">{date} · ora locală {timeOf(c.time)}</p>
        </div>
        <button
          type="button"
          className="fav-btn"
          aria-pressed={isFavorite}
          aria-label={favLabel}
          title={favLabel}
          onClick={onToggleFavorite}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="current-main">
        <span className="current-icon" aria-hidden="true">{icon}</span>
        <p className="current-temp">{Math.round(c.temperature_2m)}{units.temp}</p>
        <div className="current-text">
          <p className="current-desc">{desc}</p>
          <p className="current-range">
            Max {Math.round(today.temperature_2m_max[0])}{units.temp} · Min {Math.round(today.temperature_2m_min[0])}{units.temp}
          </p>
          <p className="current-range">Se simte ca {Math.round(c.apparent_temperature)}{units.temp}</p>
        </div>
      </div>
    </article>
  )
}

export default CurrentWeather

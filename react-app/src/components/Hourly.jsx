import { useMemo } from 'react'
import { timeOf, weatherInfo } from '../weather'
import Chart from './Chart'

function Hourly({ weather, units, theme }) {
  // Următoarele 24 de ore, începând cu ora curentă
  const hours = useMemo(() => {
    const h = weather.hourly
    const hourKey = weather.current.time.slice(0, 13)
    let start = h.time.findIndex((t) => t.startsWith(hourKey))
    if (start < 0) start = 0
    const end = Math.min(start + 24, h.time.length)

    const list = []
    for (let i = start; i < end; i++) {
      list.push({
        time: timeOf(h.time[i]),
        icon: weatherInfo(h.weather_code[i], h.is_day[i] === 1).icon,
        temp: h.temperature_2m[i],
        rain: h.precipitation_probability[i] ?? 0,
      })
    }
    return list
  }, [weather.hourly, weather.current.time])

  const chartData = useMemo(
    () => ({
      hours: hours.map((h) => h.time),
      temps: hours.map((h) => h.temp),
      rain: hours.map((h) => h.rain),
    }),
    [hours],
  )

  return (
    <section className="card card-wide" aria-labelledby="hourly-title">
      <h2 id="hourly-title" className="card-title">🕒 Următoarele 24 de ore</h2>

      <ol className="hourly">
        {hours.map((hour, i) => (
          <li key={i} className={i === 0 ? 'hour is-now' : 'hour'}>
            <span className="hour-time">{i === 0 ? 'Acum' : hour.time}</span>
            <span className="hour-icon">{hour.icon}</span>
            <span className="hour-temp">{Math.round(hour.temp)}{units.temp}</span>
            <span className="hour-rain">{hour.rain >= 10 ? `💧${hour.rain}%` : ''}</span>
          </li>
        ))}
      </ol>

      <Chart data={chartData} theme={theme} />
    </section>
  )
}

export default Hourly

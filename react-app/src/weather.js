// =================================================================
// Configurare și funcții ajutătoare (fără React)
// API-uri gratuite Open-Meteo (fără cheie API)
// =================================================================
export const API = {
  geo: 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
  air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
}

export const STORAGE = {
  theme: 'meteo.theme',
  favorites: 'meteo.favorites',
  last: 'meteo.last',
}

// Orașul afișat la prima deschidere
export const DEFAULT_PLACE = {
  name: 'București',
  admin1: 'București',
  country: 'România',
  latitude: 44.43225,
  longitude: 26.10626,
}

const REQUEST_TIMEOUT = 12000

// Coduri meteo WMO -> descriere + iconițe (zi / noapte)
const WEATHER = {
  0: ['Senin', '☀️', '🌙'],
  1: ['Predominant senin', '🌤️', '🌙'],
  2: ['Parțial noros', '⛅', '☁️'],
  3: ['Înnorat', '☁️', '☁️'],
  45: ['Ceață', '🌫️', '🌫️'],
  48: ['Ceață cu chiciură', '🌫️', '🌫️'],
  51: ['Burniță slabă', '🌦️', '🌧️'],
  53: ['Burniță', '🌦️', '🌧️'],
  55: ['Burniță densă', '🌧️', '🌧️'],
  56: ['Burniță înghețată', '🌧️', '🌧️'],
  57: ['Burniță înghețată', '🌧️', '🌧️'],
  61: ['Ploaie slabă', '🌦️', '🌧️'],
  63: ['Ploaie', '🌧️', '🌧️'],
  65: ['Ploaie puternică', '🌧️', '🌧️'],
  66: ['Ploaie înghețată', '🌧️', '🌧️'],
  67: ['Ploaie înghețată', '🌧️', '🌧️'],
  71: ['Ninsoare slabă', '🌨️', '🌨️'],
  73: ['Ninsoare', '🌨️', '🌨️'],
  75: ['Ninsoare abundentă', '❄️', '❄️'],
  77: ['Grăunțe de zăpadă', '🌨️', '🌨️'],
  80: ['Averse slabe', '🌦️', '🌧️'],
  81: ['Averse', '🌧️', '🌧️'],
  82: ['Averse puternice', '⛈️', '⛈️'],
  85: ['Averse de ninsoare', '🌨️', '🌨️'],
  86: ['Averse de ninsoare', '❄️', '❄️'],
  95: ['Furtună', '⛈️', '⛈️'],
  96: ['Furtună cu grindină', '⛈️', '⛈️'],
  99: ['Furtună cu grindină', '⛈️', '⛈️'],
}

// Indicele european al calității aerului (EAQI)
export const AQI_LEVELS = [
  { max: 20, label: 'Bună', color: '#22c55e' },
  { max: 40, label: 'Acceptabilă', color: '#84cc16' },
  { max: 60, label: 'Moderată', color: '#eab308' },
  { max: 80, label: 'Slabă', color: '#f97316' },
  { max: 100, label: 'Foarte slabă', color: '#ef4444' },
  { max: Infinity, label: 'Extrem de slabă', color: '#9333ea' },
]

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SV', 'V', 'NV']

// localStorage – protejat, aplicația merge și dacă e blocat
export const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key)
      return value === null ? fallback : JSON.parse(value)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // fără salvare – nu e o problemă
    }
  },
}

// Cerere HTTP cu limită de timp și mesaje de eroare clare
export async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Serverul a răspuns cu eroarea ${response.status}.`)
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Serverul răspunde prea greu. Încearcă din nou.')
    if (error instanceof TypeError) throw new Error('Nu mă pot conecta la serviciul meteo. Verifică conexiunea la internet.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

// Caută orașe după nume
export async function searchPlaces(name, count) {
  const data = await fetchJson(`${API.geo}?name=${encodeURIComponent(name)}&count=${count}&language=ro&format=json`)
  return data.results || []
}

// Descarcă prognoza și calitatea aerului în paralel
export async function fetchForecast(place, days, unit) {
  const imperial = unit === 'fahrenheit'

  const weatherParams = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,precipitation',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: days,
    temperature_unit: unit,
    wind_speed_unit: imperial ? 'mph' : 'kmh',
  })

  const airParams = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: 'european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone',
    timezone: 'auto',
  })

  // Dacă cererea pentru aer eșuează, restul merge
  const [weather, air] = await Promise.all([
    fetchJson(`${API.forecast}?${weatherParams}`),
    fetchJson(`${API.air}?${airParams}`).catch(() => null),
  ])

  const units = { temp: '°', wind: imperial ? 'mph' : 'km/h' }
  return { weather, air, units }
}

export const placeLabel = (p) =>
  [p.name, p.admin1, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')

export const placeId = (p) => `${Number(p.latitude).toFixed(2)},${Number(p.longitude).toFixed(2)}`

// Orele vin deja în fusul orar al orașului ("2026-10-21T14:00")
export const timeOf = (iso) => iso.slice(11, 16)

export function weatherInfo(code, isDay = true) {
  const [desc, dayIcon, nightIcon] = WEATHER[code] || ['Necunoscut', '🌡️', '🌡️']
  return { desc, icon: isDay ? dayIcon : nightIcon }
}

export function skyFor(code, isDay) {
  if (code >= 95) return 'storm'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 51) return 'rain'
  if (code === 45 || code === 48) return 'fog'
  if (code === 3) return 'cloudy'
  return isDay ? 'clear-day' : 'clear-night'
}

export function dayName(isoDate, index) {
  if (index === 0) return 'Azi'
  if (index === 1) return 'Mâine'
  // Ora 12 evită decalajul de fus orar la transformarea datei
  return new Date(`${isoDate}T12:00`).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric' })
}

export function uvLevel(uv) {
  if (uv == null) return '–'
  if (uv < 3) return 'Scăzut'
  if (uv < 6) return 'Moderat'
  if (uv < 8) return 'Ridicat'
  if (uv < 11) return 'Foarte ridicat'
  return 'Extrem'
}

export const windDirection = (deg) => WIND_DIRECTIONS[Math.round(deg / 45) % 8]

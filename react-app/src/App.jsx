import { useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import SearchForm from './components/SearchForm'
import Favorites from './components/Favorites'
import CurrentWeather from './components/CurrentWeather'
import Hourly from './components/Hourly'
import Daily from './components/Daily'
import Details from './components/Details'
import AirQuality from './components/AirQuality'
import ContactForm from './components/ContactForm'
import { DEFAULT_PLACE, STORAGE, fetchForecast, placeId, skyFor, storage } from './weather'
import './App.css'

// Tema salvată sau, dacă nu există, cea din setările sistemului
function getInitialTheme() {
  const saved = storage.get(STORAGE.theme, null)
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  // ===== Starea aplicației =====
  const [theme, setTheme] = useState(getInitialTheme)
  const [days, setDays] = useState(7)
  const [unit, setUnit] = useState('celsius')
  const [place, setPlace] = useState(null)
  const [forecast, setForecast] = useState(null) // { weather, air, units }
  const [status, setStatus] = useState({ message: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState(() => storage.get(STORAGE.favorites, []))

  const heroRef = useRef(null)
  const requestId = useRef(0) // ca să ignorăm răspunsurile vechi

  // ===== Tema =====
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    storage.set(STORAGE.theme, theme)
  }, [theme])

  // ===== Favoritele se salvează automat la fiecare schimbare =====
  useEffect(() => {
    storage.set(STORAGE.favorites, favorites)
  }, [favorites])

  function showStatus(message, type = '') {
    setStatus({ message, type })
  }

  // ===== Încărcarea datelor meteo =====
  async function loadWeather(newPlace, options = {}) {
    const { scroll = true, days: d = days, unit: u = unit } = options
    const id = ++requestId.current

    setLoading(true)
    showStatus('Se încarcă prognoza...', 'loading')

    try {
      const result = await fetchForecast(newPlace, d, u)
      if (id !== requestId.current) return

      setPlace(newPlace)
      setForecast(result)
      storage.set(STORAGE.last, newPlace)
      showStatus('')

      if (scroll) heroRef.current.scrollIntoView({ block: 'start' })
    } catch (error) {
      if (id === requestId.current) showStatus(error.message, 'error')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  // La prima deschidere: ultimul oraș căutat sau București
  useEffect(() => {
    loadWeather(storage.get(STORAGE.last, null) || DEFAULT_PLACE, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Schimbarea numărului de zile sau a unității reîncarcă imediat
  function handleDaysChange(newDays) {
    setDays(newDays)
    if (place) loadWeather(place, { scroll: false, days: newDays })
  }

  function handleUnitChange(newUnit) {
    setUnit(newUnit)
    if (place) loadWeather(place, { scroll: false, unit: newUnit })
  }

  // ===== Favorite =====
  const isFavorite = place !== null && favorites.some((f) => placeId(f) === placeId(place))

  function toggleFavorite() {
    if (!place) return
    if (isFavorite) {
      setFavorites(favorites.filter((f) => placeId(f) !== placeId(place)))
    } else {
      setFavorites([...favorites, place])
    }
  }

  function removeFavorite(fav) {
    setFavorites(favorites.filter((f) => placeId(f) !== placeId(fav)))
  }

  // Fundalul zonei de sus se schimbă după vreme
  const sky = forecast
    ? skyFor(forecast.weather.current.weather_code, forecast.weather.current.is_day === 1)
    : 'clear-day'

  return (
    <>
      <a className="skip-link" href="#continut">Sari la conținut</a>

      <Header theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <main id="continut" className="page">
        {/* ===== Hero: căutare + vremea curentă ===== */}
        <section id="cautare" ref={heroRef} className="hero" data-sky={sky} aria-labelledby="hero-title">
          <h1 id="hero-title" className="visually-hidden">Caută prognoza meteo</h1>

          <SearchForm
            days={days}
            unit={unit}
            loading={loading}
            onDaysChange={handleDaysChange}
            onUnitChange={handleUnitChange}
            onSelectPlace={(p) => loadWeather(p)}
            onStatus={showStatus}
          />

          <Favorites favorites={favorites} onOpen={(p) => loadWeather(p)} onRemove={removeFavorite} />

          <p className={status.type ? `status is-${status.type}` : 'status'} role="status" aria-live="polite">
            {status.message}
          </p>

          {forecast && (
            <CurrentWeather
              place={place}
              weather={forecast.weather}
              units={forecast.units}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </section>

        {/* ===== Panou cu detalii ===== */}
        {forecast && (
          <div className="dashboard">
            <Hourly weather={forecast.weather} units={forecast.units} theme={theme} />
            <Daily daily={forecast.weather.daily} units={forecast.units} />
            <div className="side">
              <Details weather={forecast.weather} units={forecast.units} />
              <AirQuality air={forecast.air} />
            </div>
          </div>
        )}

        {/* ===== Formular de contact ===== */}
        <ContactForm />
      </main>

      <Footer />
    </>
  )
}

export default App

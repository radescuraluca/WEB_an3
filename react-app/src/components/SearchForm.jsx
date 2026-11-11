import { Fragment, useEffect, useRef, useState } from 'react'
import { placeLabel, searchPlaces } from '../weather'

const DAY_OPTIONS = [3, 7, 14]
const UNIT_OPTIONS = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
]

function validateCity(value) {
  if (value === '') return 'Scrie numele unui oraș.'
  if (value.length < 2) return 'Numele orașului trebuie să aibă cel puțin 2 litere.'
  if (value.length > 80) return 'Numele este prea lung.'
  if (!/^[\p{L}\s\-'.,()]+$/u.test(value)) return 'Numele poate conține doar litere, spații și cratimă.'
  return ''
}

function SearchForm({ days, unit, loading, onDaysChange, onUnitChange, onSelectPlace, onStatus }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  // Orașele deja găsite: „Brașov, Brașov, România” -> { latitude, longitude, ... }
  const knownPlaces = useRef(new Map())
  const inputRef = useRef(null)

  // Sugestii în timp ce scrii (cu 300 ms întârziere, ca să nu trimitem o cerere la fiecare literă)
  useEffect(() => {
    const text = query.trim()
    if (text.length < 2 || knownPlaces.current.has(text)) return

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(text, 5)
        results.forEach((place) => knownPlaces.current.set(placeLabel(place), place))
        setSuggestions(results.map(placeLabel))
      } catch {
        // sugestiile sunt opționale
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  function handleChange(event) {
    setQuery(event.target.value)
    if (error) setError(validateCity(event.target.value.trim()))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const text = query.trim()
    const message = validateCity(text)
    setError(message)
    if (message) {
      inputRef.current.focus()
      return
    }

    const known = knownPlaces.current.get(text)
    if (known) {
      onSelectPlace(known)
      return
    }

    // Căutăm doar după prima parte (ex: „Cluj-Napoca, Cluj” -> „Cluj-Napoca”)
    const name = text.split(',')[0].trim()
    onStatus('Caut orașul...', 'loading')
    try {
      const results = await searchPlaces(name, 1)
      if (results.length === 0) {
        onStatus(`Nu am găsit orașul „${name}”. Verifică dacă e scris corect.`, 'error')
        return
      }
      onSelectPlace(results[0])
    } catch (err) {
      onStatus(err.message, 'error')
    }
  }

  function handleGeolocation() {
    if (!navigator.geolocation) {
      onStatus('Browserul tău nu permite aflarea locației.', 'error')
      return
    }

    onStatus('Aflu locația ta...', 'loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setQuery('')
        onSelectPlace({ name: 'Locația mea', latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      },
      () => onStatus('Nu am putut afla locația. Permite accesul la locație din browser sau caută orașul manual.', 'error'),
      { timeout: 10000 },
    )
  }

  return (
    <form className="search" noValidate onSubmit={handleSubmit}>
      <div className={`search-bar${error ? ' invalid' : ''}`}>
        <label htmlFor="city" className="visually-hidden">Oraș</label>
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          type="text"
          id="city"
          name="city"
          list="city-suggestions"
          placeholder="Caută un oraș, ex: Brașov"
          maxLength={80}
          autoComplete="off"
          value={query}
          onChange={handleChange}
          aria-invalid={error !== ''}
          aria-describedby="city-error"
        />
        <datalist id="city-suggestions">
          {suggestions.map((label, i) => (
            <option key={`${label}-${i}`} value={label} />
          ))}
        </datalist>
        <button type="button" className="geo-btn" title="Folosește locația mea" aria-label="Folosește locația mea" onClick={handleGeolocation}>
          📍
        </button>
        <button type="submit" className="search-btn" disabled={loading}>Caută</button>
      </div>
      <p className="field-error" id="city-error" aria-live="polite">{error}</p>

      <div className="options">
        <fieldset className="segmented">
          <legend className="visually-hidden">Număr de zile</legend>
          {DAY_OPTIONS.map((d) => (
            <Fragment key={d}>
              <input
                type="radio"
                id={`days-${d}`}
                name="days"
                value={d}
                checked={days === d}
                onChange={() => onDaysChange(d)}
              />
              <label htmlFor={`days-${d}`}>{d} zile</label>
            </Fragment>
          ))}
        </fieldset>

        <fieldset className="segmented">
          <legend className="visually-hidden">Unitate de măsură</legend>
          {UNIT_OPTIONS.map((u) => (
            <Fragment key={u.value}>
              <input
                type="radio"
                id={`unit-${u.value}`}
                name="unit"
                value={u.value}
                checked={unit === u.value}
                onChange={() => onUnitChange(u.value)}
              />
              <label htmlFor={`unit-${u.value}`}>{u.label}</label>
            </Fragment>
          ))}
        </fieldset>
      </div>
    </form>
  )
}

export default SearchForm

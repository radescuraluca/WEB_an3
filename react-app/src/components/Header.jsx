function Header({ theme, onToggleTheme }) {
  const dark = theme === 'dark'

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="#" className="logo" aria-label="Meteo Simplu – pagina principală">
          <span className="logo-icon" aria-hidden="true">⛅</span>
          <span>Meteo<strong>Simplu</strong></span>
        </a>

        <nav aria-label="Navigare principală">
          <ul className="nav">
            <li><a href="#cautare">Prognoză</a></li>
            <li><a href="#detalii">Detalii</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>

        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={dark ? 'Activează tema deschisă' : 'Activează tema întunecată'}
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}

export default Header
import { placeId, placeLabel } from '../weather'

function Favorites({ favorites, onOpen, onRemove }) {
  return (
    <div className="favorites-row">
      <span className="favorites-label">★ Favorite:</span>

      <ul className="chips">
        {favorites.map((place) => (
          <li key={placeId(place)} className="chip">
            <button type="button" title={placeLabel(place)} onClick={() => onOpen(place)}>
              {place.name}
            </button>
            <button
              type="button"
              className="chip-remove"
              aria-label={`Elimină ${place.name} din favorite`}
              onClick={() => onRemove(place)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {favorites.length === 0 && (
        <span className="favorites-empty">apasă ☆ lângă un oraș ca să-l salvezi</span>
      )}
    </div>
  )
}

export default Favorites

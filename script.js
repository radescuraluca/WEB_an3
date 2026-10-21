"use strict";

// Tot codul pornește după ce pagina e complet încărcată,
// astfel încât toate elementele din HTML să existe deja.
document.addEventListener("DOMContentLoaded", () => {

    // =================================================================
    // Configurare – API-uri gratuite Open-Meteo (fără cheie API)
    // =================================================================
    const API = {
        geo: "https://geocoding-api.open-meteo.com/v1/search",
        forecast: "https://api.open-meteo.com/v1/forecast",
        air: "https://air-quality-api.open-meteo.com/v1/air-quality"
    };

    const STORAGE = {
        theme: "meteo.theme",
        favorites: "meteo.favorites",
        last: "meteo.last"
    };

    // Orașul afișat la prima deschidere
    const DEFAULT_PLACE = {
        name: "București",
        admin1: "București",
        country: "România",
        latitude: 44.43225,
        longitude: 26.10626
    };

    const REQUEST_TIMEOUT = 12000;

    // Coduri meteo WMO -> descriere + iconițe (zi / noapte)
    const WEATHER = {
        0: ["Senin", "☀️", "🌙"],
        1: ["Predominant senin", "🌤️", "🌙"],
        2: ["Parțial noros", "⛅", "☁️"],
        3: ["Înnorat", "☁️", "☁️"],
        45: ["Ceață", "🌫️", "🌫️"],
        48: ["Ceață cu chiciură", "🌫️", "🌫️"],
        51: ["Burniță slabă", "🌦️", "🌧️"],
        53: ["Burniță", "🌦️", "🌧️"],
        55: ["Burniță densă", "🌧️", "🌧️"],
        56: ["Burniță înghețată", "🌧️", "🌧️"],
        57: ["Burniță înghețată", "🌧️", "🌧️"],
        61: ["Ploaie slabă", "🌦️", "🌧️"],
        63: ["Ploaie", "🌧️", "🌧️"],
        65: ["Ploaie puternică", "🌧️", "🌧️"],
        66: ["Ploaie înghețată", "🌧️", "🌧️"],
        67: ["Ploaie înghețată", "🌧️", "🌧️"],
        71: ["Ninsoare slabă", "🌨️", "🌨️"],
        73: ["Ninsoare", "🌨️", "🌨️"],
        75: ["Ninsoare abundentă", "❄️", "❄️"],
        77: ["Grăunțe de zăpadă", "🌨️", "🌨️"],
        80: ["Averse slabe", "🌦️", "🌧️"],
        81: ["Averse", "🌧️", "🌧️"],
        82: ["Averse puternice", "⛈️", "⛈️"],
        85: ["Averse de ninsoare", "🌨️", "🌨️"],
        86: ["Averse de ninsoare", "❄️", "❄️"],
        95: ["Furtună", "⛈️", "⛈️"],
        96: ["Furtună cu grindină", "⛈️", "⛈️"],
        99: ["Furtună cu grindină", "⛈️", "⛈️"]
    };

    // Indicele european al calității aerului (EAQI)
    const AQI_LEVELS = [
        { max: 20, label: "Bună", color: "#22c55e" },
        { max: 40, label: "Acceptabilă", color: "#84cc16" },
        { max: 60, label: "Moderată", color: "#eab308" },
        { max: 80, label: "Slabă", color: "#f97316" },
        { max: 100, label: "Foarte slabă", color: "#ef4444" },
        { max: Infinity, label: "Extrem de slabă", color: "#9333ea" }
    ];

    const WIND_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SV", "V", "NV"];

    // =================================================================
    // Elemente din pagină
    // =================================================================
    const $ = (id) => document.getElementById(id);

    const ui = {
        themeToggle: $("theme-toggle"),
        hero: $("cautare"),
        searchForm: $("search-form"),
        searchBar: document.querySelector(".search-bar"),
        city: $("city"),
        cityError: $("city-error"),
        suggestions: $("city-suggestions"),
        geoBtn: $("geo-btn"),
        searchBtn: $("search-btn"),
        favorites: $("favorites"),
        favoritesEmpty: $("favorites-empty"),
        status: $("status"),
        current: $("current"),
        locationName: $("location-name"),
        locationTime: $("location-time"),
        favBtn: $("fav-btn"),
        currentIcon: $("current-icon"),
        currentTemp: $("current-temp"),
        currentDesc: $("current-desc"),
        currentRange: $("current-range"),
        currentFeels: $("current-feels"),
        dashboard: $("dashboard"),
        hourly: $("hourly"),
        chart: $("chart"),
        daily: $("daily"),
        dailyCount: $("daily-count"),
        details: $("details"),
        air: $("air"),
        contactForm: $("contact-form"),
        contactSuccess: $("contact-success"),
        messageCounter: $("message-counter")
    };

    // Starea aplicației
    const state = {
        place: null,
        chartData: null,
        suggestions: new Map(),
        requestId: 0
    };

    // =================================================================
    // localStorage – protejat, aplicația merge și dacă e blocat
    // =================================================================
    const storage = {
        get(key, fallback) {
            try {
                const value = localStorage.getItem(key);
                return value === null ? fallback : JSON.parse(value);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {
                // fără salvare – nu e o problemă
            }
        }
    };

    // =================================================================
    // Utilitare
    // =================================================================
    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    // Cerere HTTP cu limită de timp și mesaje de eroare clare
    async function fetchJson(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`Serverul a răspuns cu eroarea ${response.status}.`);
            return await response.json();
        } catch (error) {
            if (error.name === "AbortError") throw new Error("Serverul răspunde prea greu. Încearcă din nou.");
            if (error instanceof TypeError) throw new Error("Nu mă pot conecta la serviciul meteo. Verifică conexiunea la internet.");
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    const placeLabel = (p) => [p.name, p.admin1, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
    const placeId = (p) => `${Number(p.latitude).toFixed(2)},${Number(p.longitude).toFixed(2)}`;

    // Orele vin deja în fusul orar al orașului ("2026-10-21T14:00")
    const timeOf = (iso) => iso.slice(11, 16);

    function weatherInfo(code, isDay = true) {
        const [desc, dayIcon, nightIcon] = WEATHER[code] || ["Necunoscut", "🌡️", "🌡️"];
        return { desc, icon: isDay ? dayIcon : nightIcon };
    }

    function skyFor(code, isDay) {
        if (code >= 95) return "storm";
        if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
        if (code >= 51) return "rain";
        if (code === 45 || code === 48) return "fog";
        if (code === 3) return "cloudy";
        return isDay ? "clear-day" : "clear-night";
    }

    function dayName(isoDate, index) {
        if (index === 0) return "Azi";
        if (index === 1) return "Mâine";
        // Ora 12 evită decalajul de fus orar la transformarea datei
        return new Date(`${isoDate}T12:00`).toLocaleDateString("ro-RO", { weekday: "short", day: "numeric" });
    }

    function uvLevel(uv) {
        if (uv == null) return "–";
        if (uv < 3) return "Scăzut";
        if (uv < 6) return "Moderat";
        if (uv < 8) return "Ridicat";
        if (uv < 11) return "Foarte ridicat";
        return "Extrem";
    }

    const windDirection = (deg) => WIND_DIRECTIONS[Math.round(deg / 45) % 8];

    function setStatus(message, type = "") {
        ui.status.textContent = message;
        ui.status.className = `status${type ? ` is-${type}` : ""}`;
    }

    // Creează un element cu clasă și text (fără innerHTML pentru date externe)
    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    // =================================================================
    // Tema deschisă / întunecată
    // =================================================================
    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        const dark = theme === "dark";
        ui.themeToggle.textContent = dark ? "☀️" : "🌙";
        ui.themeToggle.setAttribute("aria-label", dark ? "Activează tema deschisă" : "Activează tema întunecată");
        if (state.chartData) drawChart();
    }

    ui.themeToggle.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        storage.set(STORAGE.theme, next);
    });

    // =================================================================
    // Formularul de căutare – validare
    // =================================================================
    function validateCity() {
        const value = ui.city.value.trim();
        let message = "";

        if (value === "") {
            message = "Scrie numele unui oraș.";
        } else if (value.length < 2) {
            message = "Numele orașului trebuie să aibă cel puțin 2 litere.";
        } else if (value.length > 80) {
            message = "Numele este prea lung.";
        } else if (!/^[\p{L}\s\-'.,()]+$/u.test(value)) {
            message = "Numele poate conține doar litere, spații și cratimă.";
        }

        ui.cityError.textContent = message;
        ui.searchBar.classList.toggle("invalid", message !== "");
        ui.city.setAttribute("aria-invalid", String(message !== ""));
        return message === "";
    }

    // Sugestii în timp ce scrii (autocompletare)
    const loadSuggestions = debounce(async (query) => {
        try {
            const data = await fetchJson(`${API.geo}?name=${encodeURIComponent(query)}&count=5&language=ro&format=json`);
            ui.suggestions.innerHTML = "";
            (data.results || []).forEach((place) => {
                const label = placeLabel(place);
                state.suggestions.set(label, place);
                const option = document.createElement("option");
                option.value = label;
                ui.suggestions.appendChild(option);
            });
        } catch {
            // sugestiile sunt opționale
        }
    }, 300);

    ui.city.addEventListener("input", () => {
        if (ui.cityError.textContent) validateCity();
        const query = ui.city.value.trim();
        if (query.length >= 2 && !state.suggestions.has(query)) loadSuggestions(query);
    });

    ui.searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateCity()) {
            ui.city.focus();
            return;
        }

        const query = ui.city.value.trim();
        const known = state.suggestions.get(query);
        if (known) {
            loadWeather(known);
            return;
        }

        // Căutăm doar după prima parte (ex: „Cluj-Napoca, Cluj” -> „Cluj-Napoca”)
        const name = query.split(",")[0].trim();
        setStatus("Caut orașul...", "loading");
        try {
            const data = await fetchJson(`${API.geo}?name=${encodeURIComponent(name)}&count=1&language=ro&format=json`);
            if (!data.results || data.results.length === 0) {
                setStatus(`Nu am găsit orașul „${name}”. Verifică dacă e scris corect.`, "error");
                return;
            }
            loadWeather(data.results[0]);
        } catch (error) {
            setStatus(error.message, "error");
        }
    });

    // Schimbarea numărului de zile sau a unității reîncarcă imediat
    ui.searchForm.querySelectorAll('input[type="radio"]').forEach((radio) => {
        radio.addEventListener("change", () => {
            if (state.place) loadWeather(state.place, { scroll: false });
        });
    });

    // Locația mea
    ui.geoBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
            setStatus("Browserul tău nu permite aflarea locației.", "error");
            return;
        }

        setStatus("Aflu locația ta...", "loading");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                ui.city.value = "";
                loadWeather({
                    name: "Locația mea",
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
            },
            () => setStatus("Nu am putut afla locația. Permite accesul la locație din browser sau caută orașul manual.", "error"),
            { timeout: 10000 }
        );
    });

    // =================================================================
    // Încărcarea datelor meteo
    // =================================================================
    function getOptions() {
        const form = ui.searchForm;
        return {
            days: Number(form.querySelector('input[name="days"]:checked').value),
            unit: form.querySelector('input[name="unit"]:checked').value
        };
    }

    async function loadWeather(place, { scroll = true } = {}) {
        const { days, unit } = getOptions();
        const imperial = unit === "fahrenheit";
        const requestId = ++state.requestId; // răspunsurile vechi sunt ignorate

        ui.searchBtn.disabled = true;
        setStatus("Se încarcă prognoza...", "loading");

        const weatherParams = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,precipitation",
            hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
            timezone: "auto",
            forecast_days: days,
            temperature_unit: unit,
            wind_speed_unit: imperial ? "mph" : "kmh"
        });

        const airParams = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: "european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
            timezone: "auto"
        });

        try {
            // Cele două cereri pornesc în paralel; dacă aerul eșuează, restul merge
            const [weather, air] = await Promise.all([
                fetchJson(`${API.forecast}?${weatherParams}`),
                fetchJson(`${API.air}?${airParams}`).catch(() => null)
            ]);
            if (requestId !== state.requestId) return;

            const units = { temp: "°", wind: imperial ? "mph" : "km/h" };

            state.place = place;
            storage.set(STORAGE.last, place);

            renderCurrent(place, weather, units);
            ui.current.hidden = false;
            ui.dashboard.hidden = false;
            renderHourly(weather, units);
            renderDaily(weather.daily, units);
            renderDetails(weather, units);
            renderAir(air);
            setStatus("");

            if (scroll) ui.hero.scrollIntoView({ block: "start" });
        } catch (error) {
            if (requestId === state.requestId) setStatus(error.message, "error");
        } finally {
            if (requestId === state.requestId) ui.searchBtn.disabled = false;
        }
    }

    // =================================================================
    // Afișarea rezultatelor
    // =================================================================
    function renderCurrent(place, data, units) {
        const c = data.current;
        const today = data.daily;
        const { desc, icon } = weatherInfo(c.weather_code, c.is_day === 1);

        ui.hero.dataset.sky = skyFor(c.weather_code, c.is_day === 1);
        ui.locationName.textContent = placeLabel(place);

        const date = new Date(`${c.time.slice(0, 10)}T12:00`).toLocaleDateString("ro-RO", {
            weekday: "long", day: "numeric", month: "long"
        });
        ui.locationTime.textContent = `${date} · ora locală ${timeOf(c.time)}`;

        ui.currentIcon.textContent = icon;
        ui.currentTemp.textContent = `${Math.round(c.temperature_2m)}${units.temp}`;
        ui.currentDesc.textContent = desc;
        ui.currentRange.textContent = `Max ${Math.round(today.temperature_2m_max[0])}${units.temp} · Min ${Math.round(today.temperature_2m_min[0])}${units.temp}`;
        ui.currentFeels.textContent = `Se simte ca ${Math.round(c.apparent_temperature)}${units.temp}`;

        updateFavButton();
    }

    function renderHourly(data, units) {
        const h = data.hourly;
        const hourKey = data.current.time.slice(0, 13);
        let start = h.time.findIndex((t) => t.startsWith(hourKey));
        if (start < 0) start = 0;
        const end = Math.min(start + 24, h.time.length);

        ui.hourly.innerHTML = "";
        for (let i = start; i < end; i++) {
            const { icon } = weatherInfo(h.weather_code[i], h.is_day[i] === 1);
            const rain = h.precipitation_probability[i] ?? 0;

            const item = make("li", i === start ? "hour is-now" : "hour");
            item.append(
                make("span", "hour-time", i === start ? "Acum" : timeOf(h.time[i])),
                make("span", "hour-icon", icon),
                make("span", "hour-temp", `${Math.round(h.temperature_2m[i])}${units.temp}`),
                make("span", "hour-rain", rain >= 10 ? `💧${rain}%` : "")
            );
            ui.hourly.appendChild(item);
        }
        ui.hourly.scrollLeft = 0;

        state.chartData = {
            hours: h.time.slice(start, end).map(timeOf),
            temps: h.temperature_2m.slice(start, end),
            rain: h.precipitation_probability.slice(start, end).map((p) => p ?? 0)
        };
        drawChart();
    }

    function renderDaily(daily, units) {
        const count = daily.time.length;
        const lowest = Math.min(...daily.temperature_2m_min);
        const highest = Math.max(...daily.temperature_2m_max);
        const span = highest - lowest || 1;

        ui.dailyCount.textContent = count;
        ui.daily.innerHTML = "";

        for (let i = 0; i < count; i++) {
            const min = daily.temperature_2m_min[i];
            const max = daily.temperature_2m_max[i];
            const { desc, icon } = weatherInfo(daily.weather_code[i]);
            const rain = daily.precipitation_probability_max[i];

            const row = make("li", "day");
            row.style.animationDelay = `${i * 30}ms`;
            row.title = desc;

            // Bara arată intervalul de temperatură al zilei față de toată perioada
            const range = make("div", "range");
            const fill = make("div", "range-fill");
            fill.style.left = `${((min - lowest) / span) * 100}%`;
            fill.style.width = `${Math.max(((max - min) / span) * 100, 4)}%`;
            range.appendChild(fill);

            const iconEl = make("span", "day-icon", icon);
            iconEl.setAttribute("aria-label", desc);

            row.append(
                make("span", "day-name", dayName(daily.time[i], i)),
                iconEl,
                make("span", "day-min", `${Math.round(min)}${units.temp}`),
                range,
                make("span", "day-max", `${Math.round(max)}${units.temp}`),
                make("span", "day-rain", rain ? `💧${rain}%` : "")
            );
            ui.daily.appendChild(row);
        }
    }

    function renderDetails(data, units) {
        const c = data.current;
        const uv = data.daily.uv_index_max[0];

        const items = [
            ["💧 Umiditate", `${c.relative_humidity_2m}%`],
            ["💨 Vânt", `${Math.round(c.wind_speed_10m)} ${units.wind}`, `dinspre ${windDirection(c.wind_direction_10m)}`],
            ["🌡️ Presiune", `${Math.round(c.surface_pressure)} hPa`],
            ["☁️ Nori", `${c.cloud_cover}%`],
            ["🔆 Indice UV", uv == null ? "–" : uv.toFixed(1), uvLevel(uv)],
            ["🌧️ Precipitații", `${c.precipitation} mm`, "în ultima oră"],
            ["🌅 Răsărit", timeOf(data.daily.sunrise[0])],
            ["🌇 Apus", timeOf(data.daily.sunset[0])]
        ];

        ui.details.innerHTML = "";
        items.forEach(([label, value, note]) => {
            const box = make("div", "detail");
            const dd = make("dd", null, value);
            if (note) dd.appendChild(make("small", null, note));
            box.append(make("dt", null, label), dd);
            ui.details.appendChild(box);
        });
    }

    function renderAir(air) {
        ui.air.innerHTML = "";
        const c = air && air.current;

        if (!c || c.european_aqi == null) {
            ui.air.appendChild(make("p", "muted", "Datele despre calitatea aerului nu sunt disponibile pentru această locație."));
            return;
        }

        const aqi = Math.round(c.european_aqi);
        const level = AQI_LEVELS.find((l) => aqi <= l.max);

        const head = make("div", "aqi-head");
        const value = make("span", "aqi-value", aqi);
        value.style.color = level.color;
        head.append(value, make("span", "aqi-label", level.label), make("span", "muted", "indice european"));

        const scale = make("div", "aqi-scale");
        const marker = make("span", "aqi-marker");
        marker.style.left = `${Math.min(aqi, 100)}%`;
        scale.appendChild(marker);

        const list = make("ul", "pollutants");
        [
            ["PM2.5", c.pm2_5, "particule fine"],
            ["PM10", c.pm10, "particule"],
            ["NO₂", c.nitrogen_dioxide, "dioxid de azot"],
            ["O₃", c.ozone, "ozon"]
        ].forEach(([name, val, note]) => {
            const li = make("li", "pollutant");
            li.append(
                make("strong", null, val == null ? "–" : `${Math.round(val)} µg/m³`),
                make("span", null, `${name} · ${note}`)
            );
            list.appendChild(li);
        });

        ui.air.append(head, scale, list);
    }

    // =================================================================
    // Grafic pe <canvas> (desenat manual, fără biblioteci)
    // =================================================================
    function drawChart() {
        const data = state.chartData;
        const canvas = ui.chart;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!data || width === 0 || data.temps.length < 2) return;

        // Claritate pe ecrane de înaltă rezoluție
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const muted = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#64748b";
        const pad = { top: 26, right: 14, bottom: 26, left: 14 };
        const w = width - pad.left - pad.right;
        const h = height - pad.top - pad.bottom;
        const n = data.temps.length;
        const step = w / n;

        const min = Math.min(...data.temps) - 1;
        const max = Math.max(...data.temps) + 1;
        const x = (i) => pad.left + step * i + step / 2;
        const y = (t) => pad.top + h - ((t - min) / (max - min)) * h * 0.85;

        ctx.clearRect(0, 0, width, height);
        ctx.font = "600 11px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";

        // Bare: șanse de precipitații
        ctx.fillStyle = "rgba(14, 165, 233, 0.35)";
        data.rain.forEach((p, i) => {
            const barH = (p / 100) * h;
            if (barH > 0) ctx.fillRect(x(i) - step * 0.3, pad.top + h - barH, step * 0.6, barH);
        });

        // Zona de sub linia temperaturii
        const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
        gradient.addColorStop(0, "rgba(245, 158, 11, 0.35)");
        gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.beginPath();
        ctx.moveTo(x(0), pad.top + h);
        data.temps.forEach((t, i) => ctx.lineTo(x(i), y(t)));
        ctx.lineTo(x(n - 1), pad.top + h);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Linia temperaturii
        ctx.beginPath();
        data.temps.forEach((t, i) => (i === 0 ? ctx.moveTo(x(i), y(t)) : ctx.lineTo(x(i), y(t))));
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.stroke();

        // Etichete: temperatură și oră
        const every = width < 520 ? 4 : 3;
        data.temps.forEach((t, i) => {
            if (i % every !== 0) return;
            ctx.beginPath();
            ctx.arc(x(i), y(t), 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "#f59e0b";
            ctx.fill();

            ctx.fillStyle = muted;
            ctx.fillText(`${Math.round(t)}°`, x(i), y(t) - 10);
            ctx.fillText(i === 0 ? "Acum" : data.hours[i], x(i), height - 6);
        });
    }

    window.addEventListener("resize", debounce(drawChart, 150));

    // =================================================================
    // Favorite
    // =================================================================
    const getFavorites = () => storage.get(STORAGE.favorites, []);
    const isFavorite = (place) => getFavorites().some((f) => placeId(f) === placeId(place));

    function updateFavButton() {
        const fav = Boolean(state.place && isFavorite(state.place));
        ui.favBtn.textContent = fav ? "★" : "☆";
        ui.favBtn.setAttribute("aria-pressed", String(fav));
        ui.favBtn.setAttribute("aria-label", fav ? "Elimină din favorite" : "Adaugă la favorite");
        ui.favBtn.title = ui.favBtn.getAttribute("aria-label");
    }

    function saveFavorites(list) {
        storage.set(STORAGE.favorites, list);
        updateFavButton();
        renderFavorites();
    }

    ui.favBtn.addEventListener("click", () => {
        if (!state.place) return;
        const list = getFavorites();
        saveFavorites(isFavorite(state.place)
            ? list.filter((f) => placeId(f) !== placeId(state.place))
            : [...list, state.place]);
    });

    function renderFavorites() {
        const list = getFavorites();
        ui.favorites.innerHTML = "";
        ui.favoritesEmpty.hidden = list.length > 0;

        list.forEach((place) => {
            const chip = make("li", "chip");

            const open = make("button", null, place.name);
            open.type = "button";
            open.title = placeLabel(place);
            open.addEventListener("click", () => {
                ui.city.value = "";
                loadWeather(place);
            });

            const remove = make("button", "chip-remove", "✕");
            remove.type = "button";
            remove.setAttribute("aria-label", `Elimină ${place.name} din favorite`);
            remove.addEventListener("click", () => {
                saveFavorites(getFavorites().filter((f) => placeId(f) !== placeId(place)));
            });

            chip.append(open, remove);
            ui.favorites.appendChild(chip);
        });
    }

    // =================================================================
    // Formularul de contact – validare
    // =================================================================
    const contactRules = {
        name(value) {
            if (!value) return "Numele este obligatoriu.";
            if (value.length < 3) return "Numele trebuie să aibă cel puțin 3 caractere.";
            if (!/^[\p{L}\s\-']+$/u.test(value)) return "Numele poate conține doar litere, spații și cratimă.";
            return "";
        },
        email(value) {
            if (!value) return "Emailul este obligatoriu.";
            if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) return "Adresa de email nu este validă (ex: nume@exemplu.ro).";
            return "";
        },
        phone(value) {
            if (!value) return ""; // opțional
            if (!/^(\+40|0)7\d{8}$/.test(value.replace(/[\s.-]/g, ""))) return "Număr invalid. Exemplu: 0712 345 678.";
            return "";
        },
        subject(value) {
            return value ? "" : "Alege un subiect.";
        },
        message(value) {
            if (!value) return "Mesajul este obligatoriu.";
            if (value.length < 20) return `Mai scrie cel puțin ${20 - value.length} caractere.`;
            return "";
        },
        consent(_value, field) {
            return field.checked ? "" : "Trebuie să bifezi acordul.";
        }
    };

    function validateContactField(name) {
        const field = ui.contactForm.elements[name];
        const message = contactRules[name](field.value.trim(), field);
        const ok = message === "";

        $(`${name}-error`).textContent = message;
        field.classList.toggle("invalid", !ok);
        field.classList.toggle("valid", ok && field.type !== "checkbox" && field.value.trim() !== "");
        field.setAttribute("aria-invalid", String(!ok));
        return ok;
    }

    // Validare la părăsirea câmpului, apoi în timp real după prima verificare
    Object.keys(contactRules).forEach((name) => {
        const field = ui.contactForm.elements[name];
        const liveEvent = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "input";

        field.addEventListener("blur", () => {
            if (field.value.trim() !== "" || field.classList.contains("invalid")) validateContactField(name);
        });
        field.addEventListener(liveEvent, () => {
            if (field.classList.contains("invalid") || field.classList.contains("valid") || liveEvent === "change") {
                validateContactField(name);
            }
        });
    });

    ui.contactForm.elements.message.addEventListener("input", (event) => {
        ui.messageCounter.textContent = `${event.target.value.length} / 500`;
    });

    ui.contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        ui.contactSuccess.hidden = true;

        const allValid = Object.keys(contactRules).map(validateContactField).every(Boolean);
        if (!allValid) {
            ui.contactForm.querySelector(".invalid")?.focus();
            return;
        }

        // Nu avem server, așa că doar confirmăm primirea
        const name = ui.contactForm.elements.name.value.trim();
        ui.contactSuccess.textContent = `✓ Mulțumim, ${name}! Mesajul tău a fost trimis.`;
        ui.contactSuccess.hidden = false;

        ui.contactForm.reset();
        ui.contactForm.querySelectorAll(".valid, .invalid").forEach((f) => f.classList.remove("valid", "invalid"));
        ui.messageCounter.textContent = "0 / 500";
    });

    // =================================================================
    // Pornire
    // =================================================================
    const savedTheme = storage.get(STORAGE.theme, null);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

    renderFavorites();
    loadWeather(storage.get(STORAGE.last, null) || DEFAULT_PLACE, { scroll: false });
});

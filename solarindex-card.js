/**
 * SolarIndex Lovelace Card
 * Custom element for Home Assistant dashboards.
 *
 * Config:
 *   type: custom:solarindex-card
 *   entity_prefix: sensor.solarindex   (optional, default: "sensor.solarindex")
 *   title: "My Solar Forecast"         (optional)
 */

const WEATHER_ICONS = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "🌨", 75: "❄️",
  80: "🌦", 81: "🌧", 82: "⛈",
  95: "⛈", 96: "⛈", 99: "⛈",
};

const CONDITION_COLORS = {
  sunny: "#f59e0b",
  mixed: "#6366f1",
  overcast: "#64748b",
};

const CONDITION_LABELS = {
  sunny: "Sunny",
  mixed: "Mixed",
  overcast: "Overcast",
};

const DAY_KEYS = [
  "today", "tomorrow", "day_3", "day_4", "day_5", "day_6", "day_7", "day_8"
];

const DAY_LABELS = [
  "Today", "Tomorrow", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8"
];

function getWeatherIcon(code) {
  if (code === undefined || code === null) return "🌤";
  for (const key of Object.keys(WEATHER_ICONS).map(Number).sort((a, b) => b - a)) {
    if (code >= key) return WEATHER_ICONS[key];
  }
  return "🌤";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

class SolarIndexCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }

  static getConfigElement() {
    return document.createElement("solarindex-card-editor");
  }

  static getStubConfig() {
    return { title: "Solar Forecast" };
  }

  setConfig(config) {
    this._config = { title: "Solar Forecast", ...config };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _s(entityId) {
    if (!entityId || !this._hass) return undefined;
    return this._hass.states[entityId];
  }

  _render() {
    if (!this._hass) return;

    const cfg = this._config;

    // Check if required sensors are configured
    if (!cfg.entity_today) {
      this.shadowRoot.innerHTML = `
        <style>:host{display:block;}.card{background:var(--card-background-color);border-radius:16px;padding:24px;font-family:sans-serif;color:var(--primary-text-color);text-align:center;opacity:0.7;}</style>
        <div class="card">
          <div style="font-size:40px;margin-bottom:12px;">☀️</div>
          <div style="font-weight:600;margin-bottom:6px;">SolarIndex</div>
          <div style="font-size:13px;opacity:0.6;">Bitte Karte konfigurieren:<br>Stift-Icon → Sensoren eintragen</div>
        </div>`;
      return;
    }

    const DAY_ENTITY_KEYS = [
      cfg.entity_today, cfg.entity_tomorrow,
      cfg.entity_day3, cfg.entity_day4, cfg.entity_day5,
      cfg.entity_day6, cfg.entity_day7, cfg.entity_day8,
    ];

    const forecasts = DAY_ENTITY_KEYS.map((entityId, i) => {
      const state = this._s(entityId);
      if (!state) return null;
      const attrs = state.attributes || {};
      return {
        label: DAY_LABELS[i],
        kwh: parseFloat(state.state) || 0,
        date: attrs.date,
        condition: attrs.condition || "mixed",
        weather_code: attrs.weather_code,
        temp_max: attrs.temp_max_c,
        radiation: attrs.radiation_mj_m2,
        sunrise: attrs.sunrise,
        sunset: attrs.sunset,
      };
    }).filter(Boolean);

    const accuracyState = this._s(cfg.entity_accuracy);
    const countState = this._s(cfg.entity_training);
    const conditionState = this._s(cfg.entity_condition);

    const accuracy = accuracyState ? parseFloat(accuracyState.state) || 0 : 0;
    const trainingCount = countState ? parseInt(countState.state) || 0 : 0;
    // Fall back to today's forecast condition attribute if sensor not found
    const todayCondition = conditionState
      ? conditionState.state
      : (forecasts[0]?.condition || "mixed");
    const today = forecasts[0] || {};

    // Chart data
    const maxKwh = Math.max(...forecasts.map(f => f.kwh), 1);

    const styles = `
      :host { display: block; }
      .card {
        background: var(--card-background-color, #1c1c1e);
        border-radius: 16px;
        padding: 20px;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
        color: var(--primary-text-color, #fff);
        overflow: hidden;
      }
      .card-title {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.5;
        margin-bottom: 16px;
      }
      .today-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding: 16px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
      }
      .today-kwh {
        font-size: 42px;
        font-weight: 700;
        line-height: 1;
      }
      .today-kwh span {
        font-size: 16px;
        font-weight: 400;
        opacity: 0.6;
        margin-left: 4px;
      }
      .today-meta {
        text-align: right;
      }
      .condition-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .today-details {
        font-size: 12px;
        opacity: 0.6;
        line-height: 1.6;
      }
      .weather-icon { font-size: 36px; }

      /* 7-day strip */
      .forecast-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
        margin-bottom: 20px;
        scrollbar-width: none;
      }
      .forecast-strip::-webkit-scrollbar { display: none; }
      .forecast-day {
        flex: 0 0 72px;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        padding: 10px 6px;
        text-align: center;
        font-size: 11px;
      }
      .forecast-day.today-day {
        background: rgba(99,102,241,0.2);
        border: 1px solid rgba(99,102,241,0.5);
      }
      .forecast-day-label {
        opacity: 0.5;
        margin-bottom: 4px;
        font-size: 10px;
      }
      .forecast-day-icon { font-size: 18px; margin-bottom: 4px; }
      .forecast-day-kwh {
        font-weight: 700;
        font-size: 13px;
      }

      /* Chart */
      .chart-section { margin-bottom: 20px; }
      .chart-title {
        font-size: 11px;
        opacity: 0.4;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .chart {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        height: 60px;
      }
      .chart-bar-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        justify-content: flex-end;
      }
      .chart-bar {
        width: 100%;
        border-radius: 4px 4px 0 0;
        min-height: 3px;
        transition: height 0.3s;
      }
      .chart-bar-label {
        font-size: 9px;
        opacity: 0.4;
        margin-top: 3px;
      }

      /* Training progress */
      .training-section {
        padding: 12px;
        background: rgba(255,255,255,0.04);
        border-radius: 10px;
      }
      .training-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 8px;
        opacity: 0.7;
      }
      .progress-bar-bg {
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      .progress-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
      }
    `;

    const conditionColor = CONDITION_COLORS[todayCondition] || "#6366f1";
    const conditionLabel = CONDITION_LABELS[todayCondition] || todayCondition;

    const forecastDaysHtml = forecasts.slice(1).map((f, i) => `
      <div class="forecast-day">
        <div class="forecast-day-label">${DAY_LABELS[i + 1].substring(0, 3)}</div>
        <div class="forecast-day-icon">${getWeatherIcon(f.weather_code)}</div>
        <div class="forecast-day-kwh">${f.kwh.toFixed(1)}</div>
      </div>
    `).join("");

    const chartBarsHtml = forecasts.map((f, i) => {
      const heightPct = maxKwh > 0 ? Math.max(5, (f.kwh / maxKwh) * 100) : 5;
      const color = i === 0 ? conditionColor : "rgba(255,255,255,0.2)";
      return `
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${heightPct}%; background:${color};"></div>
          <div class="chart-bar-label">${i === 0 ? "T" : i === 1 ? "T+1" : "+" + (i + 1)}</div>
        </div>
      `;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="card">
        <div class="card-title">${this._config.title}</div>

        <!-- Today -->
        <div class="today-section">
          <div>
            <div class="today-kwh">${today.kwh?.toFixed(1) ?? "—"}<span>kWh</span></div>
            <div style="font-size:11px;opacity:0.5;margin-top:4px;">${formatDate(today.date)}</div>
          </div>
          <div class="today-meta">
            <div>
              <span class="condition-badge" style="background:${conditionColor}22;color:${conditionColor};">
                ${conditionLabel}
              </span>
            </div>
            <div class="weather-icon">${getWeatherIcon(today.weather_code)}</div>
            <div class="today-details">
              ${today.temp_max != null ? `🌡 ${today.temp_max}°C` : ""}
              ${today.radiation != null ? `  ☀ ${today.radiation} MJ/m²` : ""}
            </div>
          </div>
        </div>

        <!-- 7-day strip -->
        <div class="forecast-strip">
          ${forecastDaysHtml}
        </div>

        <!-- Chart -->
        <div class="chart-section">
          <div class="chart-title">8-Day Forecast (kWh)</div>
          <div class="chart">${chartBarsHtml}</div>
        </div>

        <!-- Training progress -->
        <div class="training-section">
          <div class="training-header">
            <span>🧠 Model Training</span>
            <span>${trainingCount} / 30 entries · ${accuracy.toFixed(0)}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${accuracy}%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  getCardSize() {
    return 5;
  }
}

customElements.define("solarindex-card", SolarIndexCard);

// ---------------------------------------------------------------------------
// Card Editor (GUI configuration)
// ---------------------------------------------------------------------------

class SolarIndexCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  _fire(config) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  _field(id, label, cfg, placeholder) {
    return `
      <div class="field">
        <label>${label}</label>
        <input id="${id}" type="text" value="${cfg[id] || ""}" placeholder="${placeholder}" />
      </div>`;
  }

  _render() {
    const cfg = this._config || {};

    // Build entity list from hass for datalist suggestions
    const entityOptions = this._hass
      ? Object.keys(this._hass.states)
          .filter(id => id.startsWith("sensor."))
          .sort()
          .map(id => `<option value="${id}">`)
          .join("")
      : "";

    const FIELDS = [
      { id: "title",            label: "Titel",                          placeholder: "Solar Forecast" },
      { id: "entity_today",     label: "Sensor: Heute (Today)",          placeholder: "sensor.home_solar_forecast_today" },
      { id: "entity_tomorrow",  label: "Sensor: Morgen (Tomorrow)",      placeholder: "sensor.home_solar_forecast_tomorrow" },
      { id: "entity_day3",      label: "Sensor: Tag 3",                  placeholder: "sensor.home_solar_forecast_day_3" },
      { id: "entity_day4",      label: "Sensor: Tag 4",                  placeholder: "sensor.home_solar_forecast_day_4" },
      { id: "entity_day5",      label: "Sensor: Tag 5",                  placeholder: "sensor.home_solar_forecast_day_5" },
      { id: "entity_day6",      label: "Sensor: Tag 6",                  placeholder: "sensor.home_solar_forecast_day_6" },
      { id: "entity_day7",      label: "Sensor: Tag 7",                  placeholder: "sensor.home_solar_forecast_day_7" },
      { id: "entity_day8",      label: "Sensor: Tag 8",                  placeholder: "sensor.home_solar_forecast_day_8" },
      { id: "entity_accuracy",  label: "Sensor: Modell-Genauigkeit",     placeholder: "sensor.home_solar_model_accuracy" },
      { id: "entity_training",  label: "Sensor: Trainings-Einträge",     placeholder: "sensor.home_solar_training_entries" },
      { id: "entity_condition", label: "Sensor: Wetterbedingung Heute",  placeholder: "sensor.home_solar_today_condition" },
    ];

    this.shadowRoot.innerHTML = `
      <style>
        datalist { display: none; }
        .editor { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .section-title {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--primary-color);
          margin-top: 8px; margin-bottom: 0;
        }
        .field label {
          font-size: 12px; font-weight: 500;
          color: var(--secondary-text-color); display: block; margin-bottom: 4px;
        }
        .field input {
          width: 100%; box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 13px;
        }
        .field input:focus { outline: none; border-color: var(--primary-color); }
      </style>
      <datalist id="sensors">${entityOptions}</datalist>
      <div class="editor">
        <div class="field">
          <label>Titel</label>
          <input id="title" type="text" value="${cfg.title || "Solar Forecast"}" placeholder="Solar Forecast" />
        </div>
        <div class="section-title">☀️ Vorhersage-Sensoren</div>
        ${FIELDS.slice(1, 9).map(f => `
          <div class="field">
            <label>${f.label}</label>
            <input id="${f.id}" type="text" list="sensors" value="${cfg[f.id] || ""}" placeholder="${f.placeholder}" />
          </div>`).join("")}
        <div class="section-title">🧠 Modell-Sensoren</div>
        ${FIELDS.slice(9).map(f => `
          <div class="field">
            <label>${f.label}</label>
            <input id="${f.id}" type="text" list="sensors" value="${cfg[f.id] || ""}" placeholder="${f.placeholder}" />
          </div>`).join("")}
      </div>`;

    // Attach change listeners to all inputs
    FIELDS.forEach(({ id }) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) {
        el.addEventListener("change", (e) => {
          this._fire({ ...cfg, [id]: e.target.value.trim() || undefined });
        });
      }
    });
  }
}

customElements.define("solarindex-card-editor", SolarIndexCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solarindex-card",
  name: "SolarIndex Card",
  description: "Solar yield forecast with ML-based training progress.",
  preview: false,
});

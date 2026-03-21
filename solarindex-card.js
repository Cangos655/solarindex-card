/**
 * SolarIndex Lovelace Card
 * Custom element for Home Assistant dashboards.
 *
 * Config:
 *   type: custom:solarindex-card
 *   entity_prefix: sensor.solarindex   (optional, default: "sensor.solarindex")
 *   title: "My Solar Forecast"         (optional)
 */

const CARD_VERSION = "1.0.11";

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
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _s(entityId) {
    if (!entityId || !this._hass) return undefined;
    return this._hass.states[entityId];
  }

  // Auto-discover SolarIndex entities when not manually configured
  _discoverPrefixes() {
    if (!this._hass) return null;
    for (const [id, state] of Object.entries(this._hass.states)) {
      if (id.endsWith("_today") && state.attributes?.date) {
        const forecastPrefix = id.slice(0, -6);
        const metaPrefix = forecastPrefix.replace(/_forecast$/, "");
        return { forecast: forecastPrefix, meta: metaPrefix };
      }
    }
    return null;
  }

  _render() {
    if (!this._hass) return;

    const cfg = this._config;

    // Resolve entity IDs: use manual config if set, else auto-discover
    let entityToday, entityTomorrow, entityDay3, entityDay4,
        entityDay5, entityDay6, entityDay7, entityDay8,
        entityAccuracy, entityTraining, entityCondition;

    if (cfg.entity_today) {
      // Manual configuration
      entityToday    = cfg.entity_today;
      entityTomorrow = cfg.entity_tomorrow;
      entityDay3     = cfg.entity_day3;
      entityDay4     = cfg.entity_day4;
      entityDay5     = cfg.entity_day5;
      entityDay6     = cfg.entity_day6;
      entityDay7     = cfg.entity_day7;
      entityDay8     = cfg.entity_day8;
      entityAccuracy = cfg.entity_accuracy;
      entityTraining = cfg.entity_training;
      entityCondition = cfg.entity_condition;
    } else {
      // Auto-discovery
      const p = this._discoverPrefixes();
      if (!p) {
        this.shadowRoot.innerHTML = `
          <style>:host{display:block;}.card{background:var(--card-background-color);border-radius:16px;padding:24px;font-family:sans-serif;color:var(--primary-text-color);text-align:center;opacity:0.7;}</style>
          <div class="card">
            <div style="text-align:right;font-size:10px;opacity:0.3;margin-bottom:8px;">v${CARD_VERSION}</div>
            <div style="font-size:40px;margin-bottom:12px;">☀️</div>
            <div style="font-weight:600;margin-bottom:6px;">SolarIndex</div>
            <div style="font-size:13px;opacity:0.6;">Warte auf Daten…<br>Integration einrichten oder Sensoren manuell konfigurieren.</div>
          </div>`;
        return;
      }
      entityToday    = `${p.forecast}_today`;
      entityTomorrow = `${p.forecast}_tomorrow`;
      entityDay3     = `${p.forecast}_day_3`;
      entityDay4     = `${p.forecast}_day_4`;
      entityDay5     = `${p.forecast}_day_5`;
      entityDay6     = `${p.forecast}_day_6`;
      entityDay7     = `${p.forecast}_day_7`;
      entityDay8     = `${p.forecast}_day_8`;
      entityAccuracy = `${p.meta}_model_accuracy`;
      entityTraining = `${p.meta}_training_count`;
      entityCondition = `${p.meta}_today_condition`;
    }

    const DAY_ENTITY_KEYS = [
      entityToday, entityTomorrow,
      entityDay3, entityDay4, entityDay5,
      entityDay6, entityDay7, entityDay8,
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

    const accuracyState  = this._s(entityAccuracy);
    const countState     = this._s(entityTraining);
    const conditionState = this._s(entityCondition);

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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="card-title" style="margin-bottom:0;">${this._config.title}</div>
          <div style="font-size:10px;opacity:0.3;">v${CARD_VERSION}</div>
        </div>

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
// Card Editor (GUI configuration) – uses native ha-form with entity pickers
// ---------------------------------------------------------------------------

const EDITOR_SCHEMA = [
  { name: "title",            label: "Titel",                         selector: { text: {} } },
  { name: "entity_today",     label: "☀️ Sensor: Heute",              selector: { entity: { domain: "sensor" } } },
  { name: "entity_tomorrow",  label: "☀️ Sensor: Morgen",             selector: { entity: { domain: "sensor" } } },
  { name: "entity_day3",      label: "☀️ Sensor: Tag 3",              selector: { entity: { domain: "sensor" } } },
  { name: "entity_day4",      label: "☀️ Sensor: Tag 4",              selector: { entity: { domain: "sensor" } } },
  { name: "entity_day5",      label: "☀️ Sensor: Tag 5",              selector: { entity: { domain: "sensor" } } },
  { name: "entity_day6",      label: "☀️ Sensor: Tag 6",              selector: { entity: { domain: "sensor" } } },
  { name: "entity_day7",      label: "☀️ Sensor: Tag 7",              selector: { entity: { domain: "sensor" } } },
  { name: "entity_day8",      label: "☀️ Sensor: Tag 8",              selector: { entity: { domain: "sensor" } } },
  { name: "entity_accuracy",  label: "🧠 Sensor: Modell-Genauigkeit", selector: { entity: { domain: "sensor" } } },
  { name: "entity_training",  label: "🧠 Sensor: Trainings-Einträge", selector: { entity: { domain: "sensor" } } },
  { name: "entity_condition", label: "⛅ Sensor: Wetterbedingung",    selector: { entity: { domain: "sensor" } } },
];

class SolarIndexCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._initialized = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  setConfig(config) {
    this._config = config || {};
    if (this._form) {
      this._form.data = this._config;
    }
    if (!this._initialized) this._initialize();
  }

  connectedCallback() {
    if (!this._initialized) this._initialize();
  }

  _initialize() {
    this._initialized = true;
    this.shadowRoot.innerHTML = `<ha-form></ha-form>`;
    this._form = this.shadowRoot.querySelector("ha-form");
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = EDITOR_SCHEMA;
    this._form.computeLabel = (s) => s.label;
    this._form.addEventListener("value-changed", (e) => {
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: e.detail.value },
        bubbles: true,
        composed: true,
      }));
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

/*
 * Dehumidifier Compact Card
 * A compact, mobile-friendly Lovelace card for a `humidifier` domain entity
 * (works for dehumidifiers too, e.g. LG ThinQ via the LG ThinQ integration).
 *
 * Lets you at a glance:
 *  - see current humidity
 *  - toggle power
 *  - adjust target humidity (buttons + slider)
 *  - step through fan speed (available_modes / mode)
 *  - optionally show/open an operation-mode entity (e.g. select.xxx Manual/Auto)
 *
 * Implemented as a plain Web Component (no LitElement/lit-html dependency)
 * so it registers reliably regardless of Home Assistant frontend internals
 * or load order.
 */
(() => {
  const DEFAULT_ACCENT = "#3f6b4a";

  const CARD_STYLES = `
    :host {
      /* Organic-modern / biophilic palette: a neutral, warm-toned base (bark,
         stone) with a single accent color (default: forest green) that's the
         only thing allowed to "pop". Override --card-accent via the accent_color
         config option; everything else stays theme-driven so it sits well
         alongside the rest of a dashboard. */
      --accent-color: var(--card-accent, var(--state-humidifier-on-color, ${DEFAULT_ACCENT}));
      --accent-soft: rgba(63, 107, 74, 0.16);
      --accent-soft: color-mix(in srgb, var(--accent-color) 16%, transparent);
      --accent-glow: rgba(63, 107, 74, 0.45);
      --accent-glow: color-mix(in srgb, var(--accent-color) 45%, transparent);
      --panel-bg: var(--secondary-background-color, rgba(124, 106, 82, 0.08));
      --panel-bg: color-mix(in srgb, #7c6a52 7%, var(--card-background-color, var(--secondary-background-color, #26241f)));
      --well-bg: rgba(51, 54, 43, 0.14);
      --well-bg: color-mix(in srgb, #33362b 14%, var(--card-background-color, var(--secondary-background-color, #26241f)));
      --track-color: var(--divider-color, #3a3a3a);
    }
    ha-card {
      padding: 18px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 28px -16px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
    }
    .icon-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--panel-bg);
      color: var(--secondary-text-color);
      flex-shrink: 0;
      transition: background 0.25s, color 0.25s, box-shadow 0.25s;
    }
    .icon-avatar ha-icon {
      --mdc-icon-size: 24px;
    }
    .icon-avatar.on {
      background: var(--accent-soft);
      color: var(--accent-color);
      box-shadow: 0 0 0 1px var(--accent-soft), 0 6px 16px -4px var(--accent-glow);
    }
    .titles {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.1px;
      color: var(--primary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mode-badge {
      display: inline-flex;
      margin-top: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      color: var(--accent-color);
      background: var(--accent-soft);
      padding: 2px 8px;
      border-radius: 999px;
      cursor: pointer;
    }
    .humidity-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 7px 11px;
      border-radius: 999px;
      background: var(--panel-bg);
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-text-color);
      flex-shrink: 0;
    }
    .humidity-pill ha-icon {
      --mdc-icon-size: 16px;
      color: var(--accent-color);
    }
    .power-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--panel-bg);
      color: var(--secondary-text-color);
      cursor: pointer;
      margin-left: 2px;
      flex-shrink: 0;
      transition: background 0.25s, color 0.25s, box-shadow 0.25s;
      padding: 0;
    }
    .power-btn ha-icon {
      --mdc-icon-size: 20px;
    }
    .power-btn.on {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-color));
      color: #fff;
      box-shadow: 0 6px 16px -4px var(--accent-glow);
    }

    .panel {
      background: var(--panel-bg);
      border-radius: 18px;
      padding: 14px 16px;
      margin-bottom: 10px;
      transition: opacity 0.2s;
    }
    .panel:last-child {
      margin-bottom: 0;
    }
    .panel.disabled {
      opacity: 0.5;
    }
    .section-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: var(--secondary-text-color);
      margin-bottom: 10px;
    }

    .stepper-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .step-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: var(--well-bg);
      color: var(--primary-text-color);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      transition: opacity 0.2s;
    }
    .step-btn:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .value {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary-text-color);
    }

    input[type="range"] {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      border-radius: 3px;
      background: var(--track-color);
      outline: none;
      margin: 0;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-color);
      cursor: pointer;
      border: 3px solid var(--card-background-color, #1c1c1c);
      box-shadow: 0 2px 8px -1px var(--accent-glow);
    }
    input[type="range"]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-color);
      cursor: pointer;
      border: 3px solid var(--card-background-color, #1c1c1c);
      box-shadow: 0 2px 8px -1px var(--accent-glow);
    }

    .fan-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .fan-header ha-icon {
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
      flex-shrink: 0;
    }
    .fan-header .section-label {
      margin-bottom: 0;
    }

    .segmented {
      display: flex;
      gap: 4px;
      background: var(--well-bg);
      border-radius: 12px;
      padding: 4px;
    }
    .segment {
      flex: 1;
      border: none;
      background: transparent;
      color: var(--secondary-text-color);
      font-size: 13px;
      font-weight: 700;
      padding: 9px 0;
      border-radius: 9px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, box-shadow 0.2s;
    }
    .segment.active {
      background: var(--accent-color);
      color: #fff;
      box-shadow: 0 3px 10px -2px var(--accent-glow);
    }

    .mode-stepper {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mode-stepper button {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: var(--well-bg);
      color: var(--primary-text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .mode-stepper button ha-icon {
      --mdc-icon-size: 18px;
    }
    .mode-value {
      min-width: 52px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-color);
    }

    .not-found {
      padding: 16px;
      color: var(--error-color, #ff5252);
    }
  `;

  const EDITOR_STYLES = `
    .form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 0;
    }
    ha-textfield {
      width: 100%;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color);
      margin-top: 4px;
    }
    .hint {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin-top: -6px;
    }
    .range-row {
      display: flex;
      gap: 12px;
    }
    .range-row ha-textfield {
      flex: 1;
    }
    .color-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .color-row ha-textfield {
      flex: 1;
    }
    input[type="color"] {
      -webkit-appearance: none;
      appearance: none;
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      background: none;
      flex-shrink: 0;
    }
    input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    input[type="color"]::-webkit-color-swatch {
      border: 2px solid var(--divider-color, #444);
      border-radius: 50%;
    }
    input[type="color"]::-moz-color-swatch {
      border: 2px solid var(--divider-color, #444);
      border-radius: 50%;
    }
    .reset-btn {
      flex-shrink: 0;
      border: none;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
      color: var(--primary-text-color);
      font-size: 12px;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
    }
  `;

  const formatMode = (mode) => {
    if (!mode) return "--";
    return String(mode)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  class DehumidifierCompactCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }

    setConfig(config) {
      if (!config || !config.entity) {
        throw new Error("You need to define an entity (a humidifier domain entity)");
      }
      this._config = config;
      this._render();
    }

    set hass(hass) {
      const oldHass = this._hass;
      this._hass = hass;
      if (!this._config) return;

      const entityId = this._config.entity;
      const newState = hass.states[entityId];
      const oldState = oldHass ? oldHass.states[entityId] : undefined;

      const opEntityId = this._config.operation_mode_entity;
      const newOpState = opEntityId ? hass.states[opEntityId] : undefined;
      const oldOpState = opEntityId && oldHass ? oldHass.states[opEntityId] : undefined;

      if (!oldHass || newState !== oldState || newOpState !== oldOpState) {
        this._render();
      }
    }

    get hass() {
      return this._hass;
    }

    getCardSize() {
      return 3;
    }

    static getStubConfig(hass) {
      const entities = hass ? Object.keys(hass.states).filter((e) => e.startsWith("humidifier.")) : [];
      return { entity: entities[0] || "" };
    }

    static getConfigElement() {
      return document.createElement("dehumidifier-compact-card-editor");
    }

    connectedCallback() {
      this._render();
    }

    get _stateObj() {
      return this._hass && this._config ? this._hass.states[this._config.entity] : undefined;
    }

    get _step() {
      const stateObj = this._stateObj;
      return (
        (this._config && this._config.humidity_step) ||
        (stateObj && stateObj.attributes.target_humidity_step) ||
        5
      );
    }

    // Effective min/max: an explicit config override is a hard limit (for
    // devices whose reported min_humidity/max_humidity don't match the real
    // hardware range); otherwise fall back to what the entity reports.
    get _min() {
      const stateObj = this._stateObj;
      const configMin = this._config && this._config.min_humidity;
      return configMin != null ? configMin : (stateObj && stateObj.attributes.min_humidity) ?? 30;
    }

    get _max() {
      const stateObj = this._stateObj;
      const configMax = this._config && this._config.max_humidity;
      return configMax != null ? configMax : (stateObj && stateObj.attributes.max_humidity) ?? 80;
    }

    _render() {
      const root = this.shadowRoot;
      if (!this._config || !this._hass) return;

      if (this._config.accent_color) {
        this.style.setProperty("--card-accent", this._config.accent_color);
      } else {
        this.style.removeProperty("--card-accent");
      }

      const stateObj = this._stateObj;
      if (!stateObj) {
        root.innerHTML = `
          <style>${CARD_STYLES}</style>
          <ha-card>
            <div class="not-found">Entity not available: ${escapeHtml(this._config.entity)}</div>
          </ha-card>
        `;
        return;
      }

      const isOn = stateObj.state === "on";
      const name = this._config.name || stateObj.attributes.friendly_name || "";
      const icon = this._config.icon || "mdi:air-humidifier";
      const currentHumidity = stateObj.attributes.current_humidity;
      const targetHumidity = stateObj.attributes.humidity;
      const min = this._min;
      const max = this._max;
      const step = this._step;
      const atMin = targetHumidity != null && targetHumidity <= min;
      const atMax = targetHumidity != null && targetHumidity >= max;
      const modes = stateObj.attributes.available_modes || [];
      const modeLabel = formatMode(stateObj.attributes.mode);
      const opModeEntity = this._config.operation_mode_entity
        ? this._hass.states[this._config.operation_mode_entity]
        : null;

      const useSegmented = modes.length > 0 && modes.length <= 5;
      const currentMode = stateObj.attributes.mode;

      root.innerHTML = `
        <style>${CARD_STYLES}</style>
        <ha-card>
          <div class="header">
            <div class="icon-avatar ${isOn ? "on" : ""}">
              <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
            </div>
            <div class="titles">
              <div class="name">${escapeHtml(name)}</div>
              ${
                opModeEntity
                  ? `<div class="mode-badge" id="mode-badge">${escapeHtml(opModeEntity.state)}</div>`
                  : ""
              }
            </div>
            <div class="humidity-pill">
              <ha-icon icon="mdi:water-percent"></ha-icon>
              <span>${currentHumidity != null ? `${currentHumidity}%` : "--"}</span>
            </div>
            <button class="power-btn ${isOn ? "on" : ""}" id="power-btn" aria-label="Toggle power">
              <ha-icon icon="mdi:power"></ha-icon>
            </button>
          </div>

          <div class="panel target-section ${!isOn ? "disabled" : ""}">
            <div class="section-label">Set Humidity</div>
            <div class="stepper-row">
              <button class="step-btn" id="humidity-dec" aria-label="Decrease humidity" ${atMin ? "disabled" : ""}>−</button>
              <div class="value">${targetHumidity != null ? `${targetHumidity}%` : "--"}</div>
              <button class="step-btn" id="humidity-inc" aria-label="Increase humidity" ${atMax ? "disabled" : ""}>+</button>
            </div>
            <input
              type="range"
              id="humidity-slider"
              min="${min}"
              max="${max}"
              step="${step}"
              value="${clamp(targetHumidity ?? min, min, max)}"
            />
          </div>

          ${
            modes.length
              ? `
            <div class="panel fan-section ${!isOn ? "disabled" : ""}">
              <div class="fan-header">
                <ha-icon icon="mdi:fan"></ha-icon>
                <div class="section-label">Fan Speed</div>
              </div>
              ${
                useSegmented
                  ? `
                <div class="segmented" id="mode-segmented">
                  ${modes
                    .map(
                      (m) =>
                        `<button class="segment ${m === currentMode ? "active" : ""}" data-mode="${escapeHtml(
                          m
                        )}">${escapeHtml(formatMode(m))}</button>`
                    )
                    .join("")}
                </div>
              `
                  : `
                <div class="mode-stepper">
                  <button id="mode-prev" aria-label="Previous fan speed"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
                  <span class="mode-value">${escapeHtml(modeLabel)}</span>
                  <button id="mode-next" aria-label="Next fan speed"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
                </div>
              `
              }
            </div>
          `
              : ""
          }
        </ha-card>
      `;

      this._attachListeners(step);
    }

    _attachListeners(step) {
      const root = this.shadowRoot;

      const powerBtn = root.getElementById("power-btn");
      if (powerBtn) {
        powerBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this._togglePower();
        });
      }

      const decBtn = root.getElementById("humidity-dec");
      if (decBtn) decBtn.addEventListener("click", () => this._changeHumidity(-step));

      const incBtn = root.getElementById("humidity-inc");
      if (incBtn) incBtn.addEventListener("click", () => this._changeHumidity(step));

      const slider = root.getElementById("humidity-slider");
      const valueEl = root.querySelector(".target-section .value");
      if (slider) {
        this._updateSliderFill(slider);
        slider.addEventListener("input", (ev) => {
          const v = Number(ev.target.value);
          this._updateSliderFill(ev.target);
          if (valueEl) valueEl.textContent = `${v}%`;
          if (decBtn) decBtn.disabled = v <= Number(slider.min);
          if (incBtn) incBtn.disabled = v >= Number(slider.max);
        });
        slider.addEventListener("change", (ev) => this._setHumidity(Number(ev.target.value)));
      }

      const segmented = root.getElementById("mode-segmented");
      if (segmented) {
        segmented.addEventListener("click", (ev) => {
          const btn = ev.target.closest(".segment");
          if (!btn) return;
          this._setMode(btn.dataset.mode);
        });
      }

      const modePrev = root.getElementById("mode-prev");
      if (modePrev) modePrev.addEventListener("click", () => this._changeMode(-1));

      const modeNext = root.getElementById("mode-next");
      if (modeNext) modeNext.addEventListener("click", () => this._changeMode(1));

      const modeBadge = root.getElementById("mode-badge");
      if (modeBadge) {
        modeBadge.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this._openMoreInfo();
        });
      }
    }

    _updateSliderFill(slider) {
      const min = Number(slider.min);
      const max = Number(slider.max);
      const value = Number(slider.value);
      const pct = max > min ? clamp(((value - min) / (max - min)) * 100, 0, 100) : 0;
      slider.style.background = `linear-gradient(to right, var(--accent-color) ${pct}%, var(--track-color) ${pct}%)`;
    }

    _togglePower() {
      const stateObj = this._stateObj;
      if (!stateObj) return;
      this._hass.callService("humidifier", stateObj.state === "on" ? "turn_off" : "turn_on", {
        entity_id: this._config.entity,
      });
    }

    _changeHumidity(delta) {
      const stateObj = this._stateObj;
      if (!stateObj) return;
      const min = this._min;
      const max = this._max;
      const current = stateObj.attributes.humidity ?? min;
      this._setHumidity(clamp(current + delta, min, max));
    }

    _setHumidity(value) {
      this._hass.callService("humidifier", "set_humidity", {
        entity_id: this._config.entity,
        humidity: value,
      });
    }

    _setMode(mode) {
      if (!mode) return;
      this._hass.callService("humidifier", "set_mode", {
        entity_id: this._config.entity,
        mode,
      });
    }

    _changeMode(direction) {
      const stateObj = this._stateObj;
      const modes = (stateObj && stateObj.attributes.available_modes) || [];
      if (!modes.length) return;
      const currentIndex = modes.indexOf(stateObj.attributes.mode);
      let nextIndex = currentIndex + direction;
      if (nextIndex < 0) nextIndex = modes.length - 1;
      if (nextIndex >= modes.length) nextIndex = 0;
      this._hass.callService("humidifier", "set_mode", {
        entity_id: this._config.entity,
        mode: modes[nextIndex],
      });
    }

    _openMoreInfo() {
      if (!this._config.operation_mode_entity) return;
      const event = new CustomEvent("hass-more-info", {
        detail: { entityId: this._config.operation_mode_entity },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }

  class DehumidifierCompactCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._built = false;
    }

    setConfig(config) {
      this._config = config || {};
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    get hass() {
      return this._hass;
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      if (!this._hass || !this._config) return;
      const root = this.shadowRoot;

      if (!this._built) {
        root.innerHTML = `
          <style>${EDITOR_STYLES}</style>
          <div class="form">
            <ha-entity-picker id="entity" label="Entity (required)" allow-custom-entity></ha-entity-picker>
            <ha-textfield id="name" label="Name (optional)"></ha-textfield>
            <ha-icon-picker id="icon" label="Icon (optional)"></ha-icon-picker>

            <div class="section-title">Accent color</div>
            <div class="color-row">
              <input type="color" id="accent-swatch" />
              <ha-textfield id="accent-hex" label="Hex code (optional)" placeholder="${DEFAULT_ACCENT}"></ha-textfield>
              <button type="button" class="reset-btn" id="accent-reset">Reset</button>
            </div>
            <div class="hint">Leave blank to use your theme's default color.</div>

            <div class="section-title">Humidity range</div>
            <div class="range-row">
              <ha-textfield id="min-humidity" type="number" label="Minimum %"></ha-textfield>
              <ha-textfield id="max-humidity" type="number" label="Maximum %"></ha-textfield>
            </div>
            <div class="hint">
              Leave blank to auto-detect from the device. Set both to hard-limit the slider and
              +/- buttons, e.g. for a device that reports a wider range than it can actually reach.
            </div>

            <ha-textfield id="step" type="number" label="Humidity step (optional)"></ha-textfield>
            <ha-entity-picker id="opmode" label="Operation mode entity (optional, e.g. select.xxx)" allow-custom-entity></ha-entity-picker>
          </div>
        `;

        const entityPicker = root.getElementById("entity");
        entityPicker.includeDomains = ["humidifier"];
        entityPicker.addEventListener("value-changed", (ev) => this._update({ entity: ev.detail.value }));

        root.getElementById("name").addEventListener("input", (ev) => this._update({ name: ev.target.value }));

        root.getElementById("icon").addEventListener("value-changed", (ev) => this._update({ icon: ev.detail.value }));

        const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
        const accentSwatch = root.getElementById("accent-swatch");
        const accentHex = root.getElementById("accent-hex");

        accentSwatch.addEventListener("input", (ev) => {
          accentHex.value = ev.target.value;
          this._update({ accent_color: ev.target.value });
        });
        accentHex.addEventListener("input", (ev) => {
          const v = ev.target.value.trim();
          if (v === "") {
            this._update({ accent_color: undefined });
            accentSwatch.value = DEFAULT_ACCENT;
          } else if (hexPattern.test(v)) {
            accentSwatch.value = v;
            this._update({ accent_color: v });
          }
        });
        root.getElementById("accent-reset").addEventListener("click", () => {
          accentHex.value = "";
          accentSwatch.value = DEFAULT_ACCENT;
          this._update({ accent_color: undefined });
        });

        root.getElementById("min-humidity").addEventListener("input", (ev) => {
          const v = ev.target.value;
          this._update({ min_humidity: v !== "" ? Number(v) : undefined });
        });
        root.getElementById("max-humidity").addEventListener("input", (ev) => {
          const v = ev.target.value;
          this._update({ max_humidity: v !== "" ? Number(v) : undefined });
        });

        root.getElementById("step").addEventListener("input", (ev) => {
          const v = ev.target.value;
          this._update({ humidity_step: v ? Number(v) : undefined });
        });

        root
          .getElementById("opmode")
          .addEventListener("value-changed", (ev) => this._update({ operation_mode_entity: ev.detail.value }));

        this._built = true;
      }

      const entityPicker = root.getElementById("entity");
      entityPicker.hass = this._hass;
      entityPicker.value = this._config.entity || "";

      root.getElementById("name").value = this._config.name || "";

      const iconPicker = root.getElementById("icon");
      iconPicker.hass = this._hass;
      iconPicker.value = this._config.icon || "";

      root.getElementById("accent-swatch").value = this._config.accent_color || DEFAULT_ACCENT;
      root.getElementById("accent-hex").value = this._config.accent_color || "";

      root.getElementById("min-humidity").value = this._config.min_humidity ?? "";
      root.getElementById("max-humidity").value = this._config.max_humidity ?? "";

      root.getElementById("step").value = this._config.humidity_step || "";

      const opModePicker = root.getElementById("opmode");
      opModePicker.hass = this._hass;
      opModePicker.value = this._config.operation_mode_entity || "";
    }

    _update(patch) {
      const newConfig = { ...this._config, ...patch };
      Object.keys(newConfig).forEach((k) => {
        if (newConfig[k] === undefined || newConfig[k] === "") delete newConfig[k];
      });
      this._config = newConfig;
      const event = new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }

  customElements.define("dehumidifier-compact-card", DehumidifierCompactCard);
  customElements.define("dehumidifier-compact-card-editor", DehumidifierCompactCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "dehumidifier-compact-card",
    name: "Dehumidifier Compact Card",
    description:
      "A compact, mobile-friendly card for a humidifier/dehumidifier entity — adjust target humidity and fan speed at a glance.",
    preview: true,
  });
})();

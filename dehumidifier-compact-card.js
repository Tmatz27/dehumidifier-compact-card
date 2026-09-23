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
  const CARD_STYLES = `
    :host {
      --accent-color: var(--state-humidifier-on-color, #4c8bf5);
    }
    ha-card {
      padding: 16px;
      border-radius: 20px;
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .header > ha-icon {
      --mdc-icon-size: 28px;
      color: var(--paper-item-icon-color, #8a8a8a);
      flex-shrink: 0;
    }
    .header > ha-icon.on {
      color: var(--accent-color);
    }
    .titles {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mode-badge {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin-top: 2px;
      cursor: pointer;
      text-transform: capitalize;
    }
    .humidity-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color);
      flex-shrink: 0;
    }
    .humidity-badge ha-icon {
      --mdc-icon-size: 18px;
      color: var(--accent-color);
    }
    .power-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--secondary-background-color, #2c2c2c);
      color: var(--secondary-text-color);
      cursor: pointer;
      margin-left: 4px;
      flex-shrink: 0;
      transition: background 0.2s, color 0.2s;
      padding: 0;
    }
    .power-btn ha-icon {
      --mdc-icon-size: 20px;
    }
    .power-btn.on {
      background: var(--accent-color);
      color: #fff;
    }

    .section {
      margin-bottom: 14px;
      transition: opacity 0.2s;
    }
    .section.disabled {
      opacity: 0.55;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    .section-label {
      font-size: 13px;
      color: var(--secondary-text-color);
      margin-bottom: 6px;
      font-weight: 500;
    }

    .stepper-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .step-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: var(--secondary-background-color, #2c2c2c);
      color: var(--primary-text-color);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }
    .value {
      font-size: 22px;
      font-weight: 700;
      color: var(--primary-text-color);
    }

    input[type="range"] {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      border-radius: 3px;
      background: var(--divider-color, #3a3a3a);
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
      box-shadow: 0 0 0 1px var(--accent-color);
    }
    input[type="range"]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-color);
      cursor: pointer;
      border: 3px solid var(--card-background-color, #1c1c1c);
      box-shadow: 0 0 0 1px var(--accent-color);
    }

    .fan-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fan-section > ha-icon {
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
      flex-shrink: 0;
    }
    .fan-section .section-label {
      margin-bottom: 0;
      flex: 1;
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
      background: var(--secondary-background-color, #2c2c2c);
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
      font-weight: 600;
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

    _render() {
      const root = this.shadowRoot;
      if (!this._config || !this._hass) return;

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
      const min = stateObj.attributes.min_humidity ?? 30;
      const max = stateObj.attributes.max_humidity ?? 80;
      const step = this._step;
      const modes = stateObj.attributes.available_modes || [];
      const modeLabel = formatMode(stateObj.attributes.mode);
      const opModeEntity = this._config.operation_mode_entity
        ? this._hass.states[this._config.operation_mode_entity]
        : null;

      root.innerHTML = `
        <style>${CARD_STYLES}</style>
        <ha-card>
          <div class="header">
            <ha-icon icon="${escapeHtml(icon)}" class="${isOn ? "on" : ""}"></ha-icon>
            <div class="titles">
              <div class="name">${escapeHtml(name)}</div>
              ${
                opModeEntity
                  ? `<div class="mode-badge" id="mode-badge">${escapeHtml(opModeEntity.state)}</div>`
                  : ""
              }
            </div>
            <div class="humidity-badge">
              <ha-icon icon="mdi:water-percent"></ha-icon>
              <span>${currentHumidity != null ? `${currentHumidity}%` : "--"}</span>
            </div>
            <button class="power-btn ${isOn ? "on" : ""}" id="power-btn" aria-label="Toggle power">
              <ha-icon icon="mdi:power"></ha-icon>
            </button>
          </div>

          <div class="section target-section ${!isOn ? "disabled" : ""}">
            <div class="section-label">Set Humidity</div>
            <div class="stepper-row">
              <button class="step-btn" id="humidity-dec" aria-label="Decrease humidity">−</button>
              <div class="value">${targetHumidity != null ? `${targetHumidity}%` : "--"}</div>
              <button class="step-btn" id="humidity-inc" aria-label="Increase humidity">+</button>
            </div>
            <input
              type="range"
              id="humidity-slider"
              min="${min}"
              max="${max}"
              step="${step}"
              value="${targetHumidity ?? min}"
            />
          </div>

          ${
            modes.length
              ? `
            <div class="section fan-section ${!isOn ? "disabled" : ""}">
              <ha-icon icon="mdi:fan"></ha-icon>
              <div class="section-label">Fan Speed</div>
              <div class="mode-stepper">
                <button id="mode-prev" aria-label="Previous fan speed"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
                <span class="mode-value">${escapeHtml(modeLabel)}</span>
                <button id="mode-next" aria-label="Next fan speed"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
              </div>
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
      if (slider) slider.addEventListener("change", (ev) => this._setHumidity(Number(ev.target.value)));

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
      const min = stateObj.attributes.min_humidity ?? 0;
      const max = stateObj.attributes.max_humidity ?? 100;
      const current = stateObj.attributes.humidity ?? min;
      this._setHumidity(clamp(current + delta, min, max));
    }

    _setHumidity(value) {
      this._hass.callService("humidifier", "set_humidity", {
        entity_id: this._config.entity,
        humidity: value,
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
            <ha-textfield id="step" type="number" label="Humidity step (optional)"></ha-textfield>
            <ha-entity-picker id="opmode" label="Operation mode entity (optional, e.g. select.xxx)" allow-custom-entity></ha-entity-picker>
          </div>
        `;

        const entityPicker = root.getElementById("entity");
        entityPicker.includeDomains = ["humidifier"];
        entityPicker.addEventListener("value-changed", (ev) => this._update({ entity: ev.detail.value }));

        root.getElementById("name").addEventListener("input", (ev) => this._update({ name: ev.target.value }));

        root.getElementById("icon").addEventListener("value-changed", (ev) => this._update({ icon: ev.detail.value }));

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

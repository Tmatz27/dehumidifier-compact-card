# Dehumidifier Compact Card

A compact, mobile-friendly [Home Assistant](https://www.home-assistant.io/) Lovelace card for a
`humidifier` domain entity (works for dehumidifiers, e.g. LG ThinQ via the LG ThinQ integration).

Built because the default entity/device cards are either too generic or take a full screen
(more-info dialog) just to change the target humidity or fan speed. This card puts both controls
right on the dashboard, in about 3 rows, styled to fit a dark mobile dashboard.

- Current humidity reading
- Power toggle
- Target humidity: +/- buttons and a slider
- Fan speed: step through `available_modes` (Low/Mid/High/Auto/...)
- Optional badge for a separate operation-mode entity (e.g. a `select.` entity for Manual/Auto),
  tap to open its more-info dialog

## Installation

### HACS (custom repository)

1. In HACS, go to **Frontend** → the `⋮` menu → **Custom repositories**.
2. Add this repository URL, category **Dashboard**.
3. Install "Dehumidifier Compact Card".
4. HACS adds the resource automatically. If it doesn't, add it manually (see below).

### Manual

1. Copy `dehumidifier-compact-card.js` into your `config/www/` folder.
2. In **Settings → Dashboards → Resources**, add:
   - URL: `/local/dehumidifier-compact-card.js`
   - Resource type: `JavaScript Module`
3. Reload the dashboard (hard refresh on mobile if it was cached).

## Usage

Add the card via the dashboard UI (**Add Card → Dehumidifier Compact Card**) and pick your
entity, or use YAML:

```yaml
type: custom:dehumidifier-compact-card
entity: humidifier.dehumidifier
```

With all options:

```yaml
type: custom:dehumidifier-compact-card
entity: humidifier.dehumidifier
name: Dehumidifier
icon: mdi:air-humidifier
humidity_step: 5
operation_mode_entity: select.dehumidifier_operation_mode
```

### Options

| Name                    | Type   | Default                                     | Description                                                                 |
| ------------------------ | ------ | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `entity`                 | string | **required**                                 | A `humidifier.*` entity.                                                     |
| `name`                   | string | entity's `friendly_name`                     | Overrides the displayed name.                                                |
| `icon`                   | string | `mdi:air-humidifier`                         | Overrides the header icon.                                                   |
| `humidity_step`          | number | entity's `target_humidity_step` or `5`       | Step size for the +/- buttons and slider.                                    |
| `operation_mode_entity`  | string | none                                          | Any entity (e.g. a `select.` for Manual/Auto) shown as a small badge under the name; tapping it opens its more-info dialog. |

## How it works

The card reads and writes standard `humidifier` domain attributes/services:

- `current_humidity`, `humidity`, `min_humidity`, `max_humidity`, `target_humidity_step` → target
  humidity display, slider bounds, and `humidifier.set_humidity`
- `mode` / `available_modes` → fan speed stepper and `humidifier.set_mode`
- `state` → power toggle via `humidifier.turn_on` / `humidifier.turn_off`

No build step is required — it's a single dependency-free JS file that reuses Home Assistant's
own bundled `LitElement`.

# SolarIndex Card

Lovelace card for the [SolarIndex](https://github.com/Cangos655/solarindex-ha) Home Assistant integration.

Displays solar yield forecasts (8 days), weather conditions, and ML training progress.

## Installation via HACS

1. Make sure [SolarIndex integration](https://github.com/Cangos655/solarindex-ha) is installed
2. In HACS → Frontend → Add custom repository: `https://github.com/Cangos655/solarindex-card`
3. Install **SolarIndex Card**
4. Restart Home Assistant

## Usage

The card auto-discovers your SolarIndex entities. Just add it to your dashboard:

```yaml
type: custom:solarindex-card
title: Solar Forecast  # optional
```

No `entity_prefix` needed — the card finds the sensors automatically.

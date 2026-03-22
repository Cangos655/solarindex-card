# SolarIndex Card

Lovelace card for the [SolarIndex](https://github.com/Cangos655/solarindex-ha) Home Assistant integration.

Zeigt Solar-Ertragsprognosen, Wetterbedingungen und den ML-Trainingsfortschritt auf einen Blick.

## Voraussetzung

Die [SolarIndex Integration](https://github.com/Cangos655/solarindex-ha) muss installiert und eingerichtet sein.

## Installation via HACS

1. In HACS → Frontend → Benutzerdefiniertes Repository hinzufügen: `https://github.com/Cangos655/solarindex-card`
2. **SolarIndex Card** installieren
3. Browser-Cache leeren (Strg+Shift+R)

## Verwendung

Die Karte erkennt deine SolarIndex-Sensoren automatisch. Einfach zum Dashboard hinzufügen:

```yaml
type: custom:solarindex-card
title: Solar Forecast  # optional
```

Sensoren können auch manuell angegeben werden (z. B. bei mehreren Instanzen):

```yaml
type: custom:solarindex-card
title: Solar Forecast
entity_today: sensor.solarindex_today
entity_tomorrow: sensor.solarindex_tomorrow
entity_day3: sensor.solarindex_day_3
entity_day4: sensor.solarindex_day_4
entity_accuracy: sensor.solarindex_model_accuracy
entity_training: sensor.solarindex_training_count
entity_condition: sensor.solarindex_today_condition
```

## Anzeige

- **Heute**: Prognostizierter Tagesertrag, Wetterbedingung, Temperatur
- **Vorschau**: Morgen + 2 weitere Tage
- **Training**: Kompakte Übersicht des ML-Modells (Sonnig / Wechselhaft / Bewölkt · Genauigkeit)

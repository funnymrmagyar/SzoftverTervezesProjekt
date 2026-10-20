# Adatforrások és licencek

| Fájl | Forrás | Licenc |
|---|---|---|
| `stars.json` | [HYG Database v4.1](https://github.com/astronexus/HYG-Database) (Hipparcos, Yale Bright Star, Gliese katalógusok alapján) | CC BY-SA 4.0 |
| `cultures/western.json` – vonalak, leírások | [Stellarium](https://github.com/Stellarium/stellarium) „modern” égi kultúra | CC BY-SA 4.0 |
| `cultures/western.json` – magyar nevek | Stellarium magyar fordítás (`po/stellarium-skycultures/hu.po`) | GPL-2.0-or-later |
| `cultures/hungarian.json` | A csapat saját összeállítása (`data-src/cultures/hungarian.json`) | CC BY-SA 4.0 |
| `cultures/` – román, belarusz, számi, skandináv (Edda), mongol, tibeti, indiai, mandzsu, hawaii, maori, szamoai, tongai, boorong, szeri, tukano, tikuna | [Stellarium](https://github.com/Stellarium/stellarium/tree/master/skycultures) égi kultúrái (vonalak, eredeti nevek, forrásszövegek); a magyar nevek és leírások a csapat átdolgozásai. A pontos szerzők az egyes fájlok `source` mezőjében. | a fájlok `license` mezője szerint (CC BY-SA 3.0 / 4.0, CC BY 4.0) |

A `stars.json`-t és a `western.json`-t a `scripts/` mappa szkriptjei generálják (`npm run data`), kézzel ne szerkeszd őket.
A `stars.json` minden olyan csillagot tartalmaz, amely valamelyik kultúra vonalaiban szerepel, akkor is, ha 6,5 magnitúdónál halványabb.

# SzoftverTervezesProjekt

Stellarium típusú alkalmazás fejlesztés kiegészítésekkel

A **Csillagnéző** egy Expo / React Native alkalmazás (web, Android, iOS), amely egy valós idejű,
3D csillagtérképet, a világ különböző égi kultúráinak csillagképeit és három csillagászati
játékot ad egyetlen felületen. A felület magyar nyelvű.

## Tartalom

- [Funkciók](#funkciók)
- [Gyors indulás](#gyors-indulás)
- [Üzemmódok](#üzemmódok)
- [Játékok](#játékok)
- [Firebase adatmentés](#firebase-adatmentés)
- [Élő égbolt idővonala](#élő-égbolt-idővonala)
- [Naplózás](#naplózás)
- [Adatok és szkriptek](#adatok-és-szkriptek)
- [Tesztek és kódminőség](#tesztek-és-kódminőség)
- [Projektstruktúra](#projektstruktúra)

## Funkciók

- **Élő égbolt:** a csillagok, csillagképek és feliratok az idő és a megfigyelési hely
  függvényében jelennek meg; az idő húzással állítható (ld. [Élő égbolt idővonala](#élő-égbolt-idővonala)).
- **Égi kultúrák:** 18 kultúra csillagképei (magyar népi, nyugati, román, skandináv, hawaii,
  maori, boorong stb.), a csillagok a HYG katalógusból származnak.
- **Három játék:** Csillagkép-felismerő, Csillagról csillagra és Hiedelem-találó
  (ld. [Játékok](#játékok)).
- **Fiók és profil:** regisztráció és bejelentkezés, játékonkénti rekordok, trófeák tárolása.
- **Ranglista:** a képernyő jelenleg demóadatokat mutat; az online olvasás elő van készítve.

## Gyors indulás

Szükséges: Node.js (LTS, a csapat a 22-es verziót használja) és git. Python 3 csak az
adatszkriptekhez kell.

```bash
npm install
npm start          # Expo fejlesztői szerver (a menüből web / Android / iOS)
npm run web        # közvetlenül böngészőben
```

Az alkalmazás Firebase és hálózat nélkül, **helyi módban** is elindul: a fiókok ilyenkor a
készüléken maradnak. A környezeti változókat az `.env.example` fájl írja le (másold
`.env.local` néven, majd indítsd újra az Expót: `npx expo start --clear`).

## Üzemmódok

Az üzemmódot a `src/services/firebase/config.ts` a környezeti változókból határozza meg:

| Üzemmód    | Mikor aktív                                   | Mit jelent                                                                |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `local`    | alapértelmezett (nincs kulcs, nincs emulátor) | nincs hálózat, a fiókok a készüléken tárolódnak                           |
| `emulator` | `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`      | helyi Firebase Auth és Firestore emulátor                                 |
| `firebase` | `EXPO_PUBLIC_FIREBASE_API_KEY` megadva        | valódi Firebase-projekt (ld. [Firebase adatmentés](#firebase-adatmentés)) |

## Játékok

A játékok a Játékok fülről indulnak, és teljes képernyős, görgetés nélküli keretben futnak
(`src/app/play/`). Mindegyikben választható az égi kultúra és a nehézség:

- **Könnyű:** segédvonalak vagy több támpont látszik.
- **Nehéz:** kevesebb segítség, **dupla pont**.

Az elért legjobb pontszám játékonként mentődik: a készüléken fiókonként, bejelentkezett
`firebase` / `emulator` módban pedig a Firestore-ba is szinkronizálódik, megszakadt kapcsolat
esetén sorba állítva (`src/features/games/resultQueue.ts`).

### Csillagkép-felismerő

10 kör. Egy csillagképet látsz, és négy név közül kell kiválasztanod a helyeset. Könnyű módban a
vonalak is látszanak, nehézben csak a csillagok (a vonalak a válasz után tűnnek fel).

Pontozás: helyes válaszért 100 pont, plusz legfeljebb 50 pont gyorsasági bónusz (15 másodperc
alatt fogy), plusz sorozatbónusz (a 2. egymás utáni találattól 10, legfeljebb 50 pont).

### Csillagról csillagra

5 kör. Megkapod egy csillagkép nevét, és két-két csillagra koppintva behúzod a vonalait. Könnyű
módban halvány segédvonal mutatja az alakzatot, nehézben nincs; a Segítség gomb a következő
vonalat mutatja meg, de pontba kerül.

Pontozás körönként: vonalanként 20 pont, a kész körért +50, időbónusz legfeljebb +50 (90
másodperc alatt fogy), hibás koppintásonként −15, segítségenként −25. A kör pontja nem lehet
negatív.

### Hiedelem-találó

8 kör. Egy 3–5 mondatos leírást olvasol egy csillagképhez fűződő hiedelemről vagy tudnivalóról,
és a négy csillagminta közül kell kiválasztanod a hozzá tartozót. A válasz után az app jelzi, hogy
helyes volt-e, megmutatja a csillagkép nevét, és a következő kérdésre lép.

- **Támpont:** a csillagkép leírásából készül. A csillagkép nevét `[…]`-re cseréli, és kiszűri
  azokat a mondatokat, amelyek a népi neveit sorolják fel, hogy a szöveg ne árulja el a választ.
  A támpont legalább 3, legfeljebb 5 mondat, és legfeljebb kb. 450 karakter (a három mondat
  ennél hosszabb is lehet).
- **Nehézség:** könnyű módban akár 5 mondat, nehézben csak az első 3 látszik, dupla pontért.
- **Minták:** a három téves választ a kultúra többi csillagképéből sorsolja; lehetőleg eltérő
  vonalszámúakat, hogy ne legyen két megkülönböztethetetlen minta.
- **Pontozás:** mint a Csillagkép-felismerőnél, de a gyorsasági bónusz 45 másodperc alatt
  fogy, mert a leírás elolvasása időbe telik.
- **Elérhetőség:** csak azok a kultúrák választhatók, amelyekben legalább négy csillagképhez van
  3 mondatnál hosszabb leírás. Jelenleg ez a **magyar** (9 csillagkép) és a **nyugati**
  (43 csillagkép). A nyugati leírások **angol nyelvűek** (a Stellariumból származnak), ezt a
  játék jelzi.

A támpontok szövegét a `src/features/games/beliefText.ts`, a kérdések összeállítását a
`beliefLogic.ts` végzi; a magyar leírások a kultúra saját adatfájljából (`hungarian.json`)
jönnek, így a szöveg bővítésével több kérdés lesz.

### Új játék hozzáadása

A játék azonosítója több helyen szerepel, ezeket mind frissíteni kell:

1. `src/features/games/gameOptions.ts`: új bejegyzés a `GAME_OPTIONS` listában. A mentés, a sor
   és a profil ebből dolgozik, ezekhez nem kell külön hozzányúlni.
2. `src/ui/i18n.ts`: a játék címe, alcíme és a ranglista-címke (`leaderboard.*`).
3. `src/app/play/<azonosító>.tsx`: a játék képernyője (a `GameFrame` keretben).
4. `src/app/(tabs)/leaderboard.tsx`: a demóadatok kiegészítése az új játékkal.
5. `firestore.rules`: az új azonosító felvétele a `validScores` függvénybe, majd a szabályok
   **újratelepítése** (ld. a Firebase-beállítást). Ennek elmaradása miatt a pont online nem
   mentődne el. A `gameIds.test.ts` egyik tesztje ezt ellenőrzi.

## Firebase adatmentés

Az alkalmazás játékosprofilja a `users/{uid}` Firestore-dokumentumban tartja a
játékonkénti legjobb pontszámokat és a megszerzett trófeák azonosítóit. Be- és
kijelentkezéskor a trófeák állapota is betöltődik, illetve szinkronizálódik. A
`leaderboard/{uid}` dokumentum csak a ranglistához szükséges megjelenítendő nevet,
összpontszámot, játékonkénti rekordokat és trófeaszámot tartalmazza; e-mail-cím nem
kerül a nyilvános ranglistába. A bejelentkezett fiók helyi rekordjai UID-nként külön
tárolódnak, a korábbi készülékszintű rekordok pedig az első fiókhoz egyszer
átkerülnek.

1. Másold a `.env.example` fájlt `.env.local` néven, majd add meg a Firebase Console
   webes alkalmazásának `EXPO_PUBLIC_FIREBASE_*` értékeit.
2. Engedélyezd az Email/Jelszó bejelentkezést és hozz létre Firestore adatbázist.
3. Telepítsd a `firestore.rules` biztonsági szabályait:
   `npx firebase-tools@15 deploy --only firestore:rules --project <firebase-project-id>`
4. Indítsd újra az Expo szervert a környezeti változók betöltéséhez.

Helyi fejlesztéshez másold az `.env.example`-et `.env.local`-ként, állítsd
`EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` értékre, majd futtasd az
`npm run emulators` és `npm start` parancsokat. Az emulátoros projekt ID a
`.firebaserc` fájlban van beállítva.

Az online ranglista Firestore-olvasása és a profilok szinkronizálása elő van
készítve, de a jelenlegi ranglista képernyő továbbra is demóadatokat jelenít meg.
A kliensoldali szabályok kizárólag a saját fiók dokumentumának írását engedélyezik,
de szerveroldali pontszám-hitelesítés nélkül a kliens által küldött pontszámok nem
tekinthetők csalásbiztosnak.

## Trófeák

A trófeákat játékkal lehet megszerezni. A katalógus és a feltételek a
`src/features/trophies/trophies.ts` fájlban vannak (12 trófea, három nehézségi szinten):

| Trófea | Feltétel |
| --- | --- |
| Első fény | egy játék végigjátszása |
| Felfedező | mindhárom játék kipróbálása |
| Éles szem | a kérdések legalább felének eltalálása egy játékban |
| Hibátlan | minden kérdés helyes egy játékban |
| Nehéz terep | legalább 500 pont egy nehéz fokozatú játékban |
| Holdjáró | játék három különböző napon |
| Csillagnéző | tíz végigjátszott játék |
| Mestermegfigyelő | legalább 1000 pont egyetlen játékban |
| Sorozat | játék hét egymást követő napon |
| Állandó vendég | harminc végigjátszott játék |
| Sokoldalú | legalább 500 pont mindhárom játékban |
| Csillagász | legalább 5000 összpont a játékok legjobb eredményeiből |

Működés: a `recordGameResult` minden játék végén frissíti az eszközön tárolt
játékstatisztikát (`playerStats.ts`: játékszám, játékonkénti darabszám, játéknapok),
kiértékeli a feltételeket, és az újonnan megszerzett trófeákat elmenti helyben, majd a
háttérben a Firestore-ba is szinkronizálja (a megszerzett trófea sosem vész el, a
szinkron egyesíti a készülékeket). A játék végi összegzés „Új trófea” jelvénnyel
mutatja őket, a Profil képernyő pedig a megszerzett/zárolt állapotot és az `x/12`
számlálót. Új trófea felvételéhez egy elemet kell hozzáadni a `TROPHIES` listához
(és egy tesztesetet a `trophies.test.ts`-be); a Firestore-szabályokon nem kell változtatni.

Korlát: a statisztika (játékszám, napok) csak azon az eszközön él, és kijelentkezéskor
törlődik a helyi adatokkal együtt; a már megszerzett trófeák ettől függetlenül megmaradnak.

## Élő égbolt idővonala

Az élő égbolt dokkolójában húzással állítható az időpont. A `−` / `+` vezérlőkkel hét
időtáv között lehet váltani a kétórás finom beállítástól az ezeréves időablakig
(±500 év). Nyugalmi helyzetben a középső jel az aktuális időt mutatja, húzás közben
a mozgó jel követi a kiválasztott pillanatot. Az „Élő” gomb visszaállítja a valós
időt. Húzás közben a csillagtérkép legfeljebb animációs képkockánként frissül, így
elkerüljük a fölösleges állapotfrissítéseket.

## Naplózás

A naplózás a `src/services/logger` központi loggerén megy, közvetlen `console.*` hívás helyett
(ezt az ESLint `no-console` szabálya ellenőrzi):

```ts
import { createLogger } from '@/services/logger';

const log = createLogger('games');
log.warn('Az eredmény küldése nem sikerült', { game, error });
```

- **Szintek:** `debug`, `info`, `warn`, `error`, `silent`. Az alapértelmezett szint fejlesztésben
  `debug`, éles buildben `warn`, tesztekben `silent`; az `EXPO_PUBLIC_LOG_LEVEL` bármelyik
  környezetben felülírja.
- **Egységes bejegyzés:** időbélyeg, szint, üzenet, forrásmodul, kiegészítő adatok és a
  szerializált hiba.
- **Adattisztítás:** a jelszó, token, API-kulcs és hasonló nevű mezők értéke helyett `[REDACTED]`
  kerül a naplóba, az e-mail-címek pedig maszkolva jelennek meg.
- **Cserélhető kimenet:** alapból a konzol; később távoli hibagyűjtő is köthető ide a naplózó kód
  módosítása nélkül.

## Adatok és szkriptek

A csillagkatalógus és a csillagképek az `assets/data` mappában vannak; a származásuk és a
licencük az [`assets/data/ATTRIBUTION.md`](assets/data/ATTRIBUTION.md) fájlban található
(HYG adatbázis: CC BY-SA 4.0; Stellarium égi kultúrák: CC BY-SA / CC BY, a fájlok `license`
mezője szerint).

```bash
npm run data           # mindkét szkript
npm run data:cultures  # égi kultúrák (scripts/import_skycultures.py)
npm run data:stars     # csillagkatalógus (scripts/build_star_catalog.py)
```

A szkriptek letöltött nyersanyaga a `data-raw/` mappába kerül (nincs verziókövetve). A
`stars.json` és a `western.json` generált fájl, kézzel ne szerkeszd.

## Tesztek és kódminőség

```bash
npm test               # egységtesztek (Jest)
npm run typecheck      # TypeScript-ellenőrzés
npm run lint           # ESLint
npm run format:check   # Prettier (javítás: npm run format)
npm run test:auth      # Firebase Auth emulátoros integrációs tesztek
```

A Firebase-emulátorokhoz Java is szükséges. A játéktesztek a `src/features/games/__tests__/`
mappában vannak; közülük a `gameIds.test.ts` azt is ellenőrzi, hogy a `firestore.rules`
minden játékot felsorol.

## Projektstruktúra

```text
src/
  app/          Expo Router képernyők: (auth), (tabs) — élő égbolt, játékok, ranglista,
                profil —, valamint a play/ alatt a teljes képernyős játékok
  core/         platformfüggetlen logika: modellek, csillagkatalógus, csillagászati
                számítások, idő
  features/     funkciók: games, leaderboard, live
  render/       a 3D égbolt (three.js / React Three Fiber)
  services/     auth, firebase, location, logger, player
  state/        Zustand állapottárolók
  ui/           közös felületi elemek, téma, elrendezés
  config/       környezeti változók beolvasása
assets/data/    csillagkatalógus és égi kultúrák
scripts/        adatgeneráló szkriptek (Python)
firestore.rules Firestore biztonsági szabályok
```

# SzoftverTervezesProjekt

Stellarium típusú alkalmazás fejlesztés kiegészítésekkel: a cél egy Stellarium-szerű csillagnéző alkalmazás webre,
Androidra és iOS-re, a népi kultúrák csillagképeire fókuszálva.

Szoftvertervezés féléves projekt, 3 fős csapat.

**Jelenlegi állapot:** a projekt támogatja a helyi, Firebase-emulátoros és valódi Firebase-alapú bejelentkezést,
valós idejű 3D égbolt a megadott helyről és időpontról, két égi kultúra (magyar népi minta, nyugati 88 csillagkép),
húzással forgatható és nagyítható nézet, időléptetés, GPS vagy városválasztás.

## Gyors indítás

Kell hozzá: Node.js 22, telefonon az **Expo Go** app. (Java 21 csak a Firebase-emulátorhoz kell.)

```bash
npm install
npm start              # Expo fejlesztői szerver; weben nyomj w-t
```

- **Web:** a `npm start` után nyomj `w`-t (vagy `npm run web`).
- **Telefon:** olvasd be a QR-kódot az Expo Go-val. A telefon és a gép legyen ugyanazon a Wi-Fi-n.

### Bejelentkezés: három üzemmód

| Üzemmód      | Mikor                                           | Mi kell hozzá                                        |
| ------------ | ----------------------------------------------- | ---------------------------------------------------- |
| **helyi**    | alapértelmezett, ha a `.env.local` nincs / üres | semmi: nincs hálózat, a fiókok a készüléken maradnak |
| **emulátor** | `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`        | `npm run emulators` (Java 21)                        |
| **Firebase** | `EXPO_PUBLIC_FIREBASE_API_KEY` megadva          | valódi Firebase-projekt (lent)                       |

A helyi mód csak fejlesztéshez és bemutatóhoz való: a jelszavakat nem védi, és a fiókok nem közösek az eszközök
között. A Firebase-réteg (`src/services/firebase`, `FirebaseAuthService`) készen áll, az átváltás csak a
`.env.local` kitöltése. A Profil fül alján látszik, melyik üzemmód fut.

### Valódi Firebase-projekt használata

1. Firebase Console → új projekt → _Authentication_ → _Sign-in method_ → **Email/Password** bekapcsolása.
2. _Project settings_ → _Your apps_ → web app hozzáadása, a konfigurációt másold ki.
3. Másold a `.env.example`-t `.env.local` néven, és töltsd ki (`EXPO_PUBLIC_FIREBASE_API_KEY` stb.).
   A `.env.local` nincs verziókövetve. Utána indítsd újra az `npm start`-ot.

## Parancsok

| Parancs                                                 | Mit csinál                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `npm start` / `npm run web`                             | fejlesztői szerver (mobil / web)                                            |
| `npm test`                                              | egységtesztek (Jest)                                                        |
| `npm run test:auth`                                     | Firebase Auth integrációs teszt (elindítja és leállítja az emulátort)       |
| `npm run lint` · `npm run typecheck` · `npm run format` | ESLint · TypeScript · Prettier                                              |
| `npm run build:web`                                     | statikus webes build a `dist/` mappába                                      |
| `npm run data`                                          | csillag- és kultúraadatok újragenerálása (Python 3, csak standard könyvtár) |

## Projektszerkezet

```text
src/
├── app/                    Expo Router útvonalak (minden fájl egy képernyő)
│   ├── _layout.tsx         gyökér: szolgáltatások bekötése, védett útvonalak
│   ├── (auth)/             welcome, login, register
│   └── (tabs)/             live (égbolt), games (később), profile
├── core/                   tiszta TypeScript, React nélkül — jól tesztelhető
│   ├── models/             Star, SkyCulture, GeoLocation…
│   ├── astronomy/          csillagidő, koordináta-átszámítás, égbolt-forgatás
│   └── catalog/            StarCatalog, SkyCultureRepository, beépített adatok
├── services/               külső rendszerek interfészek mögött
│   ├── auth/               AuthService interfész, Firebase- és memóriabeli megvalósítás
│   ├── firebase/           Firebase app és auth (web / natív változat)
│   ├── location/           GPS (expo-location)
│   └── bootstrap.ts        composition root: melyik interfész mögé mi kerül
├── render/                 3D megjelenítés (React Three Fiber)
├── features/live/          a Live View képernyő komponensei
├── state/                  Zustand store-ok: auth, égbolt, nézet
└── ui/                     közös UI-komponensek, téma
assets/data/                generált adatok (stars.json, cultures/*.json) — ne szerkeszd kézzel
data-src/cultures/          saját kultúrák forrása (pl. magyar népi égbolt)
scripts/                    adatimport szkriptek (Python)
docs/het-01/                1. heti terv és issue-k
```

## Tervezési szabályok

- **Egyirányú függőség:** `app → features / render / ui → state → services / core`. A `core/` soha nem importál
  Reactot, Expót vagy Firebase-t.
- **Interfészek mögött a külső rendszerek:** a UI csak az `AuthService` interfészt látja; a Firebase-megvalósítást a
  `services/bootstrap.ts` köti be. A tesztek `InMemoryAuthService`-t használnak.
- **Platformfüggő kód csak `.native.ts` / `.web.ts` fájlpárokban** (pl. `firebase/auth`, `render/useWheelZoom`).
- **Az égbolt-gömböt egyetlen mátrix forgatja:** a csillagok egyenlítői koordinátákkal kerülnek a gömbre, az idő és a
  hely csak a `skyRotationMatrix()`-ot változtatja.

## Adatok

A források és licencek: [`assets/data/ATTRIBUTION.md`](assets/data/ATTRIBUTION.md) (HYG Database, Stellarium —
CC BY-SA 4.0). Új kultúra hozzáadása: JSON a `data-src/cultures/` mappába (a `hungarian.json` formátumában),
`npm run data`, majd felvétel a `src/core/catalog/index.ts` listájába.


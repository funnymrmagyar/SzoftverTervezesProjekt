# SzoftverTervezesProjekt

Stellarium típusú alkalmazás fejlesztés kiegészítésekkel

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
A trófeaazonosítók tárolása és megjelenítése elő van készítve; a trófeák megszerzési
feltételei nincsenek még implementálva. A kliensoldali szabályok kizárólag a saját fiók dokumentumának írását engedélyezik,
de szerveroldali pontszám-hitelesítés nélkül a kliens által küldött pontszámok nem
tekinthetők csalásbiztosnak.

## Élő égbolt idővonala

Az élő égbolt dokkolójában húzással állítható az időpont. A `−` / `+` vezérlőkkel hét
időtáv között lehet váltani a kétórás finom beállítástól az ezeréves időablakig
(±500 év). Nyugalmi helyzetben a középső jel az aktuális időt mutatja, húzás közben
a mozgó jel követi a kiválasztott pillanatot. Az „Élő” gomb visszaállítja a valós
időt. Húzás közben a csillagtérkép legfeljebb animációs képkockánként frissül, így
elkerüljük a fölösleges állapotfrissítéseket.

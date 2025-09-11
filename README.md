# BKK Menetrend és Járműkövető Alkalmazás

Modern, felhasználóbarát webalkalmazás a budapesti tömegközlekedés valós idejű követéséhez. Az alkalmazás a BKK FUTÁR API-t használja a járművek és menetrendek valós idejű megjelenítéséhez.

## Főbb Funkciók

### 🔍 Intelligens Megállókereső
- Megállók keresése név alapján (minimum 3 karakter)
- Legközelebbi megállók automatikus megjelenítése helymeghatározás alapján
- Részletes megállóinformációk (azonosító, távolság, irány)
- Megállótípus-specifikus ikonok (busz, villamos, troli, HÉV)

### 📱 LED-kijelző, FUTÁR Stílusú Menetrend
- Valós idejű indulási információk
- Dot-matrix stílusú kijelző
- Járatszám, célállomás és várakozási idő megjelenítése
- Automatikus frissítés 5 másodpercenként
- Éjszakai járatok megkülönböztetése
- Ellenkező irányú megállók közötti gyors váltás lehetősége

### 🗺️ Interaktív Térkép
- Valós idejű járműkövetés
- Járműtípus-specifikus ikonok (busz, villamos, troli, HÉV)
- Járművek mozgásának jelzése
- Felhasználó pozíciójának megjelenítése
- Részletes járműinformációk (popup ablakban):
  - Járatszám és célállomás
  - Következő megálló
  - Aktuális státusz
  - Rendszám és járműtípus
  - Ajtók állapota

### 📍 Helymeghatározás
- Automatikus legközelebbi megálló keresés
- Távolságok megjelenítése méterben/kilométerben
- Felhasználó pozíciójának folyamatos követése
- Térkép automatikus igazítása a kiválasztott megállóhoz

### 🎨 Vizuális Elemek
- Járműtípus-specifikus színkódolás
- Animált irányjelzők a megállóknál
- Felhasználói pozíció jelölő

## Telepítés és Beállítás

1. Klónozd le a repository-t:
```bash
git clone [repository_url]
cd bkk
```

2. Telepítsd a függőségeket:
```bash
npm install
```

3. Állítsd be az API kulcsot:
- Másold le a `.env.example` fájlt `.env` néven
- A `.env` fájlban cseréld ki a `your_api_key_here` részt a saját BKK API kulcsoddal

4. Indítsd el az alkalmazást:
```bash
npm start
```

Az alkalmazás alapértelmezetten a http://localhost:3000 címen lesz elérhető.

## Technikai Részletek

### Használt Technológiák
- React.js
- Leaflet.js térképmegjelenítéshez
- BKK FUTÁR API valós idejű adatokhoz
- HTML5 Geolocation API helymeghatározáshoz

### API Végpontok
- Megállók keresése és információk: `/stops-for-location.json`
- Indulási információk: `/arrivals-and-departures-for-stop.json`
- Járműpozíciók: `/gtfs-rt/full/VehiclePositions.txt`

### Környezeti Változók
```
REACT_APP_BKK_API_KEY=your_api_key_here
```

## API Kulcs Beszerzése

1. Látogass el a BKK hivatalos weboldalára: https://bkk.hu
2. Keress rá a "Fejlesztőknek" vagy "API" szakaszra
3. Regisztrálj és kérj API kulcsot
4. A kapott kulcsot helyezd el a `.env` fájlban

## Közreműködés

A projekthez való hozzájárulást szívesen fogadom! Ha szeretnél közreműködni:
1. Fork-old a repository-t
2. Hozz létre egy új branch-et a fejlesztésedhez
3. Commitold a változtatásaidat
4. Nyiss egy Pull Request-et

## Licensz

Copyright © 2025 Bence. Minden jog fenntartva.

Ez a szoftver a szerző szellemi tulajdona. A forráskód vagy annak bármely részének másolása, módosítása, terjesztése csak a szerző előzetes írásbeli engedélyével lehetséges.
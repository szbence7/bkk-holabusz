# BKK Bus Tracker

Ez az alkalmazás a BKK API-n keresztül lekéri az F04797 számú buszmegállóból induló járatok idejét és megjeleníti őket egy egyszerű táblázatban.

## Funkciók

- Lekéri az F04797 megállóból induló járatokat
- Csak a következő 30 percben induló járatokat mutatja
- Bal oldalon a járat számát, jobb oldalon a perceket mutatja
- 30 másodpercenként automatikusan frissül
- Egyszerű fehér háttér fekete betűkkel

## Telepítés és futtatás

1. Telepítsd a függőségeket:
```bash
npm install
```

2. Indítsd el az alkalmazást:
```bash
npm start
```

Az alkalmazás a http://localhost:3000 címen fog elérhető lenni.

## API

Az alkalmazás a BKK Futár API-t használja:
- Base URL: https://futar.bkk.hu/api/query/v1/ws/otp/api/where
- Megálló ID: F04797
- Lekérdezési intervallum: 30 másodperc
- Megjelenített időtartam: következő 30 perc

### API Kulcs Beállítása

**Fontos:** A BKK API használatához érvényes API kulcsra van szükség. Az alkalmazás jelenleg demo adatokat jelenít meg, mert a teszt kulcs nem működik.

**API kulcs beszerzése:**
1. Látogass el a BKK hivatalos weboldalára: https://bkk.hu
2. Keress rá a "Fejlesztőknek" vagy "API" szakaszra
3. Regisztrálj és kérj API kulcsot
4. Miután megkaptad az API kulcsot, kövesd az alábbi lépéseket:
   - Másold le a `.env.example` fájlt `.env` néven
   - A `.env` fájlban cseréld ki a `your_api_key_here` részt a saját API kulcsoddal

**Példa:**
```javascript
const response = await fetch(
  `${BKK_API_BASE}/arrivals-and-departures-for-stop.json?key=SAJAT_API_KULCSOD&version=3&appVersion=apiary-1.0&includeReferences=alerts&stopId=${STOP_ID}&minutesBefore=0&minutesAfter=30`
);
```

### Demo Mód

Ha nincs érvényes API kulcsod, az alkalmazás automatikusan demo adatokat fog megjeleníteni, hogy láthasd, hogyan fog kinézni a végső alkalmazás.

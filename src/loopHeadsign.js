// Körjáratok aktuális célállomásának meghatározása
// A BKK API körjáratoknál (pl. 57: Hűvösvölgy → Máriaremete → Hűvösvölgy) minden megállóra
// a fordulópontot adja meg célként, akkor is, ha a busz azon már túl van. Ilyenkor a trip
// megállólistájából kikeressük a fordulópontot, és utána a valódi végállomást mutatjuk.

const BKK_API_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';

// routeId|headsign|stopId|stopSequence -> Promise<string>; a viszonylat szerkezete nem változik, elég egyszer lekérni
const headsignCache = new Map();

const normalize = (name) => (name || '').toLowerCase().trim();

const distanceSq = (a, b) => (a.lat - b.lat) ** 2 + (a.lon - b.lon) ** 2;

const resolveFromTripDetails = (data, stopId, stopSequence, headsign) => {
  const stopTimes = data?.data?.entry?.stopTimes || [];
  const stops = data?.data?.references?.stops || {};
  if (stopTimes.length < 3) return headsign;

  const names = stopTimes.map(st => stops[st.stopId]?.name);
  const firstName = names[0];
  const lastName = names[names.length - 1];

  // Csak körjáratnál avatkozunk be (ugyanoda tér vissza, ahonnan indult)
  if (!lastName || normalize(firstName) !== normalize(lastName)) return headsign;

  let currentIndex = stopTimes.findIndex(st => st.stopSequence === stopSequence);
  if (currentIndex === -1) currentIndex = stopTimes.findIndex(st => st.stopId === stopId);
  if (currentIndex === -1) return headsign;

  // Fordulópont: a célként kiírt névhez illő megálló (pl. "Máriaremetei kegytemplom"),
  // ennek hiányában a kiindulóponttól legtávolabbi megálló
  const target = normalize(headsign);
  let turnIndex = names.findIndex((name, i) =>
    i > 0 && i < names.length - 1 && target && (normalize(name).startsWith(target) || target.startsWith(normalize(name)))
  );
  if (turnIndex === -1) {
    const origin = stops[stopTimes[0].stopId];
    if (!origin) return headsign;
    let maxDist = -1;
    stopTimes.forEach((st, i) => {
      const stop = stops[st.stopId];
      if (!stop) return;
      const dist = distanceSq(origin, stop);
      if (dist > maxDist) {
        maxDist = dist;
        turnIndex = i;
      }
    });
  }

  return turnIndex !== -1 && currentIndex >= turnIndex ? lastName : headsign;
};

const fetchLoopHeadsign = async (tripId, stopId, stopSequence, headsign, apiKey) => {
  const response = await fetch(
    `${BKK_API_BASE}/trip-details.json?key=${apiKey}&version=3&appVersion=apiary-1.0&includeReferences=stops&tripId=${tripId}`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'OK') throw new Error(`API status: ${data.status}`);
  return resolveFromTripDetails(data, stopId, stopSequence, headsign);
};

// A departures listában kicseréli a körjáratok headsign-ját az aktuális végállomásra.
// Hiba esetén az eredeti headsign marad.
export const applyLoopHeadsigns = async (departures, stopId, apiKey) => {
  return Promise.all(departures.map(async (dep) => {
    if (!dep.tripId || !dep.headsign || dep.headsign === 'N/A') return dep;

    const key = `${dep.routeKey}|${dep.headsign}|${stopId}|${dep.stopSequence}`;
    if (!headsignCache.has(key)) {
      headsignCache.set(key, fetchLoopHeadsign(dep.tripId, stopId, dep.stopSequence, dep.headsign, apiKey));
    }

    try {
      const headsign = await headsignCache.get(key);
      return headsign === dep.headsign ? dep : { ...dep, headsign };
    } catch (err) {
      console.warn('Körjárat célállomás lekérése sikertelen:', err);
      headsignCache.delete(key);
      return dep;
    }
  }));
};

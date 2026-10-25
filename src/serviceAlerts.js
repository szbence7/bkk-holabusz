// Forgalmi zavarok kinyerése az arrivals-and-departures-for-stop válaszból
// (a lekérdezésben az includeReferences-nek tartalmaznia kell az "alerts"-et)

const ALERT_SEPARATOR = '   -   ';

// Visszaadja a kijelző alsó sorába szánt szöveget, vagy üres stringet, ha nincs aktív zavar.
// Formátum: "7, 58, 114: ÚJ MEGÁLLÓ   -   ..."
export const getServiceAlertText = (data) => {
  const entry = data?.data?.entry;
  const references = data?.data?.references;
  const alerts = references?.alerts || {};
  const routes = references?.routes || {};
  const trips = references?.trips || {};

  // A megállóhoz és az innen induló járatokhoz tartozó zavarok, illetve az itt közlekedő viszonylatok
  const alertIds = new Set(entry?.alertIds || []);
  const stopRouteIds = new Set();
  (entry?.stopTimes || []).forEach(stopTime => {
    (stopTime.alertIds || []).forEach(id => alertIds.add(id));
    const routeId = trips[stopTime.tripId]?.routeId;
    if (routeId) stopRouteIds.add(routeId);
  });

  const now = Date.now() / 1000;

  return [...alertIds]
    .map(id => alerts[id])
    .filter(alert => alert && (!alert.start || alert.start <= now) && (!alert.end || now <= alert.end))
    .map(alert => {
      const header = alert.header?.translations?.hu || alert.header?.someTranslation || '';
      // Elsősorban az ebben a megállóban közlekedő érintett viszonylatokat írjuk ki,
      // ha ilyen nincs (pl. pótlóbusz jár helyettük), akkor az összes érintettet
      const alertRouteIds = alert.routeIds || [];
      const localRouteIds = alertRouteIds.filter(routeId => stopRouteIds.has(routeId));
      const routeNames = (localRouteIds.length > 0 ? localRouteIds : alertRouteIds)
        .map(routeId => routes[routeId]?.shortName)
        .filter(Boolean);
      return routeNames.length > 0 ? `${routeNames.join(', ')}: ${header}` : header;
    })
    .filter(text => text.trim().length > 0)
    .join(ALERT_SEPARATOR);
};

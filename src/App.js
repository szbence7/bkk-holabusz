import React, { useState, useEffect } from 'react';
import './App.css';

const BKK_API_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const STOP_ID = 'BKK_F04797';

function App() {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDepartures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching departures...');
      
      const response = await fetch(
        `${BKK_API_BASE}/arrivals-and-departures-for-stop.json?key=ca61c2f4-982e-4460-aebd-950c15434919&version=3&appVersion=apiary-1.0&includeReferences=routes,trips&stopId=${STOP_ID}&minutesBefore=0&minutesAfter=60`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response received:', data);
      
      // Simple check for API success
      if (data.status === 'OK' && data.data?.entry?.stopTimes) {
        const currentTime = Date.now();
        console.log('Current time:', currentTime);
        
        const departures = data.data.entry.stopTimes.map((stopTime, index) => {
          // BKK API times are in seconds, JavaScript Date.now() is in milliseconds
          const departureTimeMs = (stopTime.predictedDepartureTime || stopTime.departureTime) * 1000;
          const timeDiffMilliseconds = departureTimeMs - currentTime;
          const timeUntilDeparture = Math.round(timeDiffMilliseconds / 1000 / 60);
          
          // Get route information - try multiple approaches
          const tripId = stopTime.tripId;
          const trip = data.data.references?.trips?.[tripId];
          const routeId = trip?.routeId;
          const route = data.data.references?.routes?.[routeId];
          
          // Try to extract route number from different sources
          let routeShortName;
          if (route?.shortName) {
            routeShortName = route.shortName;
          } else if (routeId) {
            // Remove BKK_ prefix and try to get just the number
            routeShortName = routeId.replace('BKK_', '').replace(/^0+/, '') || routeId.replace('BKK_', '');
          } else if (tripId) {
            // Try to extract from tripId as last resort
            const tripMatch = tripId.match(/\d+/);
            routeShortName = tripMatch ? tripMatch[0] : `Járat ${index + 1}`;
          } else {
            routeShortName = `Járat ${index + 1}`;
          }
          
          console.log(`Bus ${index + 1}:`, {
            departureTimeOriginal: stopTime.predictedDepartureTime || stopTime.departureTime,
            departureTimeMs,
            currentTime,
            timeDiffMilliseconds,
            timeUntilDeparture,
            headsign: stopTime.stopHeadsign,
            tripId,
            routeId,
            routeShortName
          });
          
          return {
            routeId: routeShortName,
            headsign: stopTime.stopHeadsign || 'N/A',
            minutesUntil: timeUntilDeparture,
            displayTime: timeUntilDeparture <= 0 ? 'MOST' : `${timeUntilDeparture} perc`
          };
        })
        .filter(dep => dep.minutesUntil >= 0 && dep.minutesUntil <= 60)
        .sort((a, b) => a.minutesUntil - b.minutesUntil);
        
        console.log('Final departures:', departures);
        setDepartures(departures);
        setLastUpdated(new Date());
        setLoading(false);
        return; // Exit successfully
      }
      
      throw new Error('Invalid API response structure');
      
    } catch (err) {
      console.error('API error:', err);
      // Fallback to mock data
      const mockDepartures = generateMockDepartures();
      setDepartures(mockDepartures);
      setLastUpdated(new Date());
      setError('API hiba - demo adatok használata');
    } finally {
      setLoading(false);
    }
  };

  const generateMockDepartures = () => {
    const routes = ['9', '15', '105', '115', '133E', '200E'];
    const departures = [];
    
    for (let i = 0; i < 8; i++) {
      const route = routes[Math.floor(Math.random() * routes.length)];
      const minutes = Math.floor(Math.random() * 30) + 1;
      
      departures.push({
        routeId: route,
        headsign: 'Központi pályaudvar',
        minutesUntil: minutes
      });
    }
    
    return departures.sort((a, b) => a.minutesUntil - b.minutesUntil);
  };

  useEffect(() => {
    fetchDepartures();
    setCountdown(30);
    
    const fetchInterval = setInterval(() => {
      fetchDepartures();
      setCountdown(30);
    }, 30000); // Refresh every 30 seconds
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 30);
    }, 1000); // Update countdown every second
    
    return () => {
      clearInterval(fetchInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="app">
        <h1>BKK Bus Tracker - F04797</h1>
        <p>Betöltés...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <h1>BKK Bus Tracker - F04797</h1>
        <p className="error">Hiba történt: {error}</p>
        <button onClick={fetchDepartures}>Újrapróbálás</button>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>BKK Bus Tracker - F04797</h1>
      <p className="subtitle">Következő 1 órában induló járatok</p>
      
      {departures.length === 0 ? (
        <p>Nincsenek induló járatok a következő 1 órában.</p>
      ) : (
        <table className="departures-table">
          <thead>
            <tr>
              <th>Járat</th>
              <th>Perc múlva</th>
            </tr>
          </thead>
          <tbody>
            {departures.map((departure, index) => (
              <tr key={index}>
                <td className="route">{departure.routeId}</td>
                <td className="time">{departure.displayTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <div className="update-info">
        <span className="last-updated">
          Utolsó frissítés: {lastUpdated ? lastUpdated.toLocaleTimeString('hu-HU') : 'Betöltés...'}
        </span>
        <span className="countdown">
          Következő frissítés: {countdown}s
        </span>
      </div>
    </div>
  );
}

export default App;

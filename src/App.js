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

  // Dotmatrix font definitions (5x7 pixel matrix)
  const dotMatrixFont = {
    '0': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    '1': [
      [0,0,1,0,0],
      [0,1,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,1,1,1,0]
    ],
    '2': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [0,0,0,1,0],
      [0,0,1,0,0],
      [0,1,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,1]
    ],
    '3': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [0,0,0,0,1],
      [0,0,1,1,0],
      [0,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    '4': [
      [0,0,0,1,0],
      [0,0,1,1,0],
      [0,1,0,1,0],
      [1,0,0,1,0],
      [1,1,1,1,1],
      [0,0,0,1,0],
      [0,0,0,1,0]
    ],
    '5': [
      [1,1,1,1,1],
      [1,0,0,0,0],
      [1,1,1,1,0],
      [0,0,0,0,1],
      [0,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    '6': [
      [0,0,1,1,0],
      [0,1,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    '7': [
      [1,1,1,1,1],
      [0,0,0,0,1],
      [0,0,0,1,0],
      [0,0,1,0,0],
      [0,1,0,0,0],
      [0,1,0,0,0],
      [0,1,0,0,0]
    ],
    '8': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    '9': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,1],
      [0,0,0,0,1],
      [0,0,0,1,0],
      [0,1,1,0,0]
    ],
    'A': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1]
    ],
    'B': [
      [1,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,0]
    ],
    'C': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'D': [
      [1,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,0]
    ],
    'E': [
      [1,1,1,1,1],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,1]
    ],
    'F': [
      [1,1,1,1,1],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,0]
    ],
    'G': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,0],
      [1,0,1,1,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'H': [
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1]
    ],
    'I': [
      [0,1,1,1,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,1,1,1,0]
    ],
    'J': [
      [0,0,1,1,1],
      [0,0,0,1,0],
      [0,0,0,1,0],
      [0,0,0,1,0],
      [0,0,0,1,0],
      [1,0,0,1,0],
      [0,1,1,0,0]
    ],
    'K': [
      [1,0,0,0,1],
      [1,0,0,1,0],
      [1,0,1,0,0],
      [1,1,0,0,0],
      [1,0,1,0,0],
      [1,0,0,1,0],
      [1,0,0,0,1]
    ],
    'L': [
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,1]
    ],
    'M': [
      [1,0,0,0,1],
      [1,1,0,1,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1]
    ],
    'N': [
      [1,0,0,0,1],
      [1,1,0,0,1],
      [1,0,1,0,1],
      [1,0,0,1,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1]
    ],
    'O': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'P': [
      [1,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,0,0,0,0]
    ],
    'Q': [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,1,0],
      [0,1,1,0,1]
    ],
    'R': [
      [1,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,0],
      [1,0,1,0,0],
      [1,0,0,1,0],
      [1,0,0,0,1]
    ],
    'S': [
      [0,1,1,1,1],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [0,1,1,1,0],
      [0,0,0,0,1],
      [0,0,0,0,1],
      [1,1,1,1,0]
    ],
    'T': [
      [1,1,1,1,1],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0]
    ],
    'U': [
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'V': [
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,0,1,0],
      [0,1,0,1,0],
      [0,0,1,0,0]
    ],
    'W': [
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,1,0,1],
      [1,1,0,1,1],
      [1,0,0,0,1]
    ],
    'X': [
      [1,0,0,0,1],
      [0,1,0,1,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,1,0,1,0],
      [1,0,0,0,1]
    ],
    'Y': [
      [1,0,0,0,1],
      [0,1,0,1,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0]
    ],
    'Z': [
      [1,1,1,1,1],
      [0,0,0,0,1],
      [0,0,0,1,0],
      [0,0,1,0,0],
      [0,1,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,1]
    ],
    ' ': [
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0]
    ],
    ':': [
      [0,0,0,0,0],
      [0,0,1,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,1,0,0],
      [0,0,0,0,0]
    ],
    "'": [
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
      [0,0,0,0,0]
    ],
    'Á': [
      [0,0,1,0,0],
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,0,0,1]
    ],
    'É': [
      [0,0,1,0,0],
      [1,1,1,1,1],
      [1,0,0,0,0],
      [1,1,1,1,0],
      [1,0,0,0,0],
      [1,0,0,0,0],
      [1,1,1,1,1]
    ],
    'Í': [
      [0,0,1,0,0],
      [0,1,1,1,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,0,1,0,0],
      [0,1,1,1,0]
    ],
    'Ó': [
      [0,0,1,0,0],
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'Ö': [
      [0,1,0,1,0],
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'Ő': [
      [1,0,0,0,1],
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'Ú': [
      [0,0,1,0,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'Ü': [
      [0,1,0,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ],
    'Ű': [
      [0,1,0,0,1],
      [1,0,0,1,0],
      [0,0,0,0,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ]
  };

  const createDotMatrixText = (text) => {
    // Proper Hungarian uppercase conversion
    const hungarianUpper = text
      .replace(/ű/g, 'Ű')
      .replace(/ű/g, 'Ű')
      .replace(/ü/g, 'Ü')
      .replace(/ö/g, 'Ö')
      .replace(/ő/g, 'Ő')
      .replace(/ó/g, 'Ó')
      .replace(/í/g, 'Í')
      .replace(/é/g, 'É')
      .replace(/á/g, 'Á')
      .toUpperCase();
    
    const chars = hungarianUpper.split('');
    const matrix = [];
    
    // Create 7 rows for the matrix
    for (let row = 0; row < 7; row++) {
      matrix[row] = [];
      for (let charIndex = 0; charIndex < chars.length; charIndex++) {
        const char = chars[charIndex];
        const charMatrix = dotMatrixFont[char] || dotMatrixFont[' '];
        matrix[row] = matrix[row].concat(charMatrix[row]);
        // Add space between characters
        if (charIndex < chars.length - 1) {
          matrix[row].push(0);
        }
      }
    }
    
    return matrix;
  };

  const renderDotMatrixDisplay = () => {
    if (departures.length === 0) {
      const matrix = createDotMatrixText('NINCS JARAT');
      const gridColumns = matrix[0].length;
      
      return (
        <div className="dotmatrix-display">
          <div 
            className="dotmatrix-grid"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, 3px)`,
              gridTemplateRows: 'repeat(7, 3px)'
            }}
          >
            {matrix.map((row, rowIndex) => 
              row.map((pixel, pixelIndex) => (
                <div
                  key={`${rowIndex}-${pixelIndex}`}
                  className={`dotmatrix-pixel ${pixel ? 'lit' : 'unlit'}`}
                />
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="dotmatrix-display">
        {departures.slice(0, 6).map((departure, index) => {
          // Three column layout: ROUTE | DIRECTION | TIME
          const routeText = departure.routeId;
          const direction = departure.headsign || 'Kozpont';
          const timeText = departure.minutesUntil <= 0 ? "0'" : `${departure.minutesUntil}'`;
          
          // Column 1: Route number (4 chars wide, left-aligned)
          const routeColumn = routeText.padEnd(4, ' ');
          
          // Column 2: Direction (14 chars wide, left-aligned)
          const directionColumn = direction.substring(0, 16).padEnd(16, ' ');
          
          // Column 3: Time (3 chars wide, right-aligned)
          const timeColumn = timeText.padStart(3, ' ');
          
          // Combine all columns with single space separators
          const text = `${routeColumn} ${directionColumn} ${timeColumn}`;
          
          const matrix = createDotMatrixText(text);
          const gridColumns = matrix[0].length;
          
          // Check if this bus is arriving now (0 minutes)
          const isArriving = departure.minutesUntil <= 0;
          
          return (
            <div key={index} className="dotmatrix-line">
              <div 
                className={`dotmatrix-grid ${isArriving ? 'blinking' : ''}`}
                style={{
                  gridTemplateColumns: `repeat(${gridColumns}, 3px)`,
                  gridTemplateRows: 'repeat(7, 3px)'
                }}
              >
                {matrix.map((row, rowIndex) => 
                  row.map((pixel, pixelIndex) => (
                    <div
                      key={`${rowIndex}-${pixelIndex}`}
                      className={`dotmatrix-pixel ${pixel ? 'lit' : 'unlit'}`}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
      
      {/* Dotmatrix Display */}
      <div className="dotmatrix-container">
        <h2>Dot Matrix Kijelző</h2>
        {renderDotMatrixDisplay()}
      </div>
      
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

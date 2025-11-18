import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';

const BKK_API_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const API_KEY = process.env.REACT_APP_BKK_API_KEY;

// Function to get stop name from local stops.txt file
const getStopName = async (stopId) => {
  try {
    // First check if we have it cached
    if (window.stopNameCache && window.stopNameCache[stopId]) {
      return window.stopNameCache[stopId];
    }
    
    // Initialize cache if it doesn't exist
    if (!window.stopNameCache) {
      window.stopNameCache = {};
    }
    
    // Initialize stops data if not loaded yet
    if (!window.stopsData) {
      try {
        const response = await fetch('/stops.txt');
        const text = await response.text();
        const lines = text.split('\n');
        
        // Parse CSV data properly handling quoted strings
        window.stopsData = {};
        for (let i = 1; i < lines.length; i++) { // Skip header
          const line = lines[i].trim();
          if (line) {
            // Parse CSV line properly handling quoted fields
            const parts = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            parts.push(current); // Add the last part
            
            if (parts.length >= 2) {
              const stopIdFromFile = parts[0].replace(/"/g, ''); // Remove quotes
              const stopName = parts[1].replace(/"/g, ''); // Remove quotes
              window.stopsData[stopIdFromFile] = stopName;
            }
          }
        }
      } catch (error) {
        console.error('Error loading stops.txt:', error);
        window.stopsData = {};
      }
    }
    
    // Clean the stopId - remove BKK_ prefix and any other prefixes
    let cleanStopId = stopId.replace('BKK_', '').replace(/^D/, ''); // Remove BKK_ prefix and D prefix
    
    // Try to find the stop name
    let stopName = window.stopsData[cleanStopId];
    
    if (!stopName) {
      stopName = `Megálló ${stopId}`;
    }
    
    window.stopNameCache[stopId] = stopName;
    return stopName;
    
  } catch (error) {
    console.error('Error fetching stop name:', error);
    return `Megálló ${stopId}`;
  }
};

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

function DisplayOnly() {
  const { stopId } = useParams();
  const navigate = useNavigate();
  const fullStopId = stopId.startsWith('BKK_') ? stopId : `BKK_${stopId}`;
  
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainStopName, setMainStopName] = useState(null);
  const [siblingStop, setSiblingStop] = useState(null);

  const fetchDepartures = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${BKK_API_BASE}/arrivals-and-departures-for-stop.json?key=${API_KEY}&version=3&appVersion=apiary-1.0&includeReferences=routes,trips&stopId=${fullStopId}&minutesBefore=0&minutesAfter=60`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.data?.entry?.stopTimes) {
        const currentTime = Date.now();
        
        const departures = data.data.entry.stopTimes.map((stopTime, index) => {
          const departureTimeMs = (stopTime.predictedDepartureTime || stopTime.departureTime) * 1000;
          const timeDiffMilliseconds = departureTimeMs - currentTime;
          const timeUntilDeparture = Math.round(timeDiffMilliseconds / 1000 / 60);
          
          const tripId = stopTime.tripId;
          const trip = data.data.references?.trips?.[tripId];
          const routeId = trip?.routeId;
          const route = data.data.references?.routes?.[routeId];
          
          let routeShortName;
          if (route?.shortName) {
            routeShortName = route.shortName;
          } else if (routeId) {
            let cleanRouteId = routeId.replace('BKK_', '');
            cleanRouteId = cleanRouteId.replace(/^0+(\d)/, '$1');
            routeShortName = cleanRouteId || routeId.replace('BKK_', '');
          } else if (tripId) {
            const tripMatch = tripId.match(/\d+/);
            routeShortName = tripMatch ? tripMatch[0] : `Járat ${index + 1}`;
          } else {
            routeShortName = `Járat ${index + 1}`;
          }
          
          return {
            routeId: routeShortName,
            headsign: stopTime.stopHeadsign || 'N/A',
            minutesUntil: timeUntilDeparture,
            displayTime: timeUntilDeparture <= 0 ? 'MOST' : `${timeUntilDeparture} perc`,
            tripId: tripId,
            vehicleType: route?.type || 'UNDEFINED',
            isNightBus: route?.color === '000000' || route?.style?.vehicleIcon?.name === 'night-bus' || route?.style?.groupId === 6
          };
        })
        .filter(dep => dep.minutesUntil >= 0 && dep.minutesUntil <= 60)
        .sort((a, b) => a.minutesUntil - b.minutesUntil);
        
        setDepartures(departures);
        setLoading(false);
      }
      
    } catch (err) {
      console.error('API error:', err);
      setDepartures([]);
      setLoading(false);
    }
  };

  const loadMainStopName = async () => {
    try {
      const stopName = await getStopName(fullStopId);
      setMainStopName(stopName);
    } catch (error) {
      console.error('Error loading main stop name:', error);
      setMainStopName(`Megálló ${fullStopId.replace('BKK_', '')}`);
    }
  };

  const findSiblingStop = async () => {
    try {
      // Load stops.txt if not already loaded
      if (!window.stopsData) {
        const response = await fetch('/stops.txt');
        const text = await response.text();
        const lines = text.split('\n');
        
        window.stopsData = {};
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const parts = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            parts.push(current);
            
            if (parts.length >= 2) {
              const stopId = parts[0].replace(/"/g, '');
              const stopName = parts[1].replace(/"/g, '');
              window.stopsData[stopId] = stopName;
            }
          }
        }
      }

      // Get current stop info
      const cleanStopId = fullStopId.replace('BKK_', '');
      const currentStopName = window.stopsData[cleanStopId] || mainStopName;
      
      if (currentStopName) {
        // Extract the numeric part and prefix from stop ID
        const match = cleanStopId.match(/^([A-Z]*)(\d+)$/);
        if (match) {
          const prefix = match[1]; // e.g., "F"
          const number = parseInt(match[2]); // e.g., 4797
          
          // Check previous and next stop IDs
          const prevStopId = `${prefix}${String(number - 1).padStart(match[2].length, '0')}`;
          const nextStopId = `${prefix}${String(number + 1).padStart(match[2].length, '0')}`;
          
          console.log(`Checking sibling stops for ${cleanStopId}: ${prevStopId} and ${nextStopId}`);
          
          // Check if previous stop has the same name
          const prevStopName = window.stopsData[prevStopId];
          if (prevStopName === currentStopName) {
            console.log(`Found sibling stop: ${prevStopId} (${prevStopName})`);
            setSiblingStop({
              id: prevStopId,
              name: prevStopName
            });
            return;
          }
          
          // Check if next stop has the same name
          const nextStopName = window.stopsData[nextStopId];
          if (nextStopName === currentStopName) {
            console.log(`Found sibling stop: ${nextStopId} (${nextStopName})`);
            setSiblingStop({
              id: nextStopId,
              name: nextStopName
            });
            return;
          }
        }
        
        console.log('No sibling stop found for', cleanStopId);
        setSiblingStop(null);
      } else {
        setSiblingStop(null);
      }
    } catch (error) {
      console.error('Error finding sibling stop:', error);
      setSiblingStop(null);
    }
  };

  const switchToSiblingStop = () => {
    if (siblingStop) {
      navigate(`/${siblingStop.id}`);
    }
  };

  useEffect(() => {
    loadMainStopName();
    fetchDepartures();
    findSiblingStop();
    
    const fetchInterval = setInterval(() => {
      fetchDepartures();
    }, 5000);
    
    return () => {
      clearInterval(fetchInterval);
    };
  }, [fullStopId]);

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
          const routeText = departure.routeId;
          const direction = departure.headsign || 'Kozpont';
          const timeText = departure.minutesUntil <= 0 ? "0'" : `${departure.minutesUntil}'`;
          
          const routeColumn = routeText.padEnd(4, ' ');
          
          const calculateDirectionLength = () => {
            const screenWidth = window.innerWidth;
            const totalPadding = 70;
            const charFullWidth = 3.8;
            const routeWidth = (4 + 1) * charFullWidth;
            const timeWidth = (3 + 1) * charFullWidth;
            const availableWidth = screenWidth - totalPadding - routeWidth - timeWidth;
            let maxChars = Math.floor(availableWidth / charFullWidth);
            
            if (screenWidth <= 375) {
              maxChars = Math.min(maxChars, 9);
            } else if (screenWidth <= 390) {
              maxChars = Math.min(maxChars, 9);
            } else if (screenWidth <= 428) {
              maxChars = Math.min(maxChars, 10);
            } else if (screenWidth <= 440) {
              maxChars = Math.min(maxChars, 12);
            } else {
              maxChars = Math.min(maxChars, 16);
            }
            
            return Math.max(6, Math.min(20, maxChars));
          };
          
          const directionMaxLength = calculateDirectionLength();
          const directionColumn = direction.substring(0, directionMaxLength).padEnd(directionMaxLength, ' ');
          const timeColumn = timeText.padStart(3, ' ');
          const text = `${routeColumn} ${directionColumn} ${timeColumn}`;
          
          const matrix = createDotMatrixText(text);
          const gridColumns = matrix[0].length;
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
      <div className="dotmatrix-container">
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div className="dotmatrix-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px'}}>
            <div style={{textAlign: 'left'}}>
              <h1 style={{color: 'white', margin: 0}}>{mainStopName || fullStopId.replace('BKK_', '')}</h1>
            </div>
            {siblingStop && (
              <div style={{textAlign: 'right'}}>
                <button 
                  onClick={switchToSiblingStop}
                  title={`Váltás a pár megállóra: ${siblingStop.name}`}
                  style={{
                    background: 'none',
                  }}
                >
                🔄
                </button>
              </div>
            )}
          </div>
        </div>
        {renderDotMatrixDisplay()}
        <h6 style={{color: 'white', marginTop: '10px', marginBottom: '0'}}>{fullStopId}</h6>
      </div>
    </div>
  );
}

export default DisplayOnly;


import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './App.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vehicle icon with rotation based on vehicle type
const createVehicleIcon = (bearing, vehicleType, isNightBus = false) => {
  let iconSrc = '/BKV_busz_symbol.svg.png'; // Default bus icon
  let altText = 'Bus';
  
  // Determine icon based on vehicle type
  if (isNightBus) {
    iconSrc = '/BKK_night_line_logo.svg.png';
    altText = 'Night Bus';
  } else {
    switch (vehicleType) {
      case 'TRAM':
        iconSrc = '/Logo_tramway-budapest.svg.png';
        altText = 'Tram';
        break;
      case 'TROLLEYBUS':
        iconSrc = '/Budapest_trolleybus_symbol.svg.png';
        altText = 'Trolleybus';
        break;
      case 'SUBWAY':
        iconSrc = '/BKV_busz_symbol.svg.png'; // Metro uses bus icon for now
        altText = 'Metro';
        break;
      case 'RAIL':
        iconSrc = '/Budapest_hev_symbol.svg.png';
        altText = 'HEV';
        break;
      case 'BUS':
      default:
        iconSrc = '/BKV_busz_symbol.svg.png';
        altText = 'Bus';
        break;
    }
  }
  
  return new L.DivIcon({
    html: `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img 
          src="${iconSrc}" 
          alt="${altText}" 
          style="
            width: 20px;
            height: 20px;
          "
        />
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${bearing || 0}deg) translateY(-12px);
          width: 0;
          height: 0;
          border-left: 3px solid transparent;
          border-right: 3px solid transparent;
          border-bottom: 6px solid #ff4444;
          pointer-events: none;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: 'bkv-vehicle-marker'
  });
};

// Custom stop icon - white circle with BKV blue border and direction triangle
const createStopIcon = (direction) => {
  return new L.DivIcon({
    html: `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 16px;
          height: 16px;
          background-color: white;
          border: 3px solid #1e88e5;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${direction || 0}deg) translateY(-12px);
          width: 0;
          height: 0;
          border-left: 3px solid transparent;
          border-right: 3px solid transparent;
          border-bottom: 6px solid #000000;
          pointer-events: none;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: 'bkv-stop-marker'
  });
};

const BKK_API_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const DEFAULT_STOP_ID = 'BKK_F04797';
const API_KEY = 'ca61c2f4-982e-4460-aebd-950c15434919';

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
        console.log('Loaded stops data:', Object.keys(window.stopsData).length, 'stops');
      } catch (error) {
        console.error('Error loading stops.txt:', error);
        window.stopsData = {};
      }
    }
    
    console.log('Looking for stop name for:', stopId);
    
    // Clean the stopId - remove BKK_ prefix and any other prefixes
    let cleanStopId = stopId.replace('BKK_', '').replace(/^D/, ''); // Remove BKK_ prefix and D prefix
    
    // Try to find the stop name
    let stopName = window.stopsData[cleanStopId];
    
    if (stopName) {
      console.log('Found stop name:', stopName, 'for stopId:', stopId, '(clean:', cleanStopId, ')');
    } else {
      console.log('Stop not found in stops.txt for:', stopId, '(clean:', cleanStopId, ')');
      // Fallback to known mappings
      const stopMappings = {
        '044602': 'Solymár, temető',
        '044603': 'Solymár, temető',
        '570655': 'Solymár, temető',
        'BKK_F04797': 'Keleti pályaudvar M',
      };
      
      stopName = stopMappings[stopId] || `Megálló ${stopId}`;
    }
    
    window.stopNameCache[stopId] = stopName;
    return stopName;
    
  } catch (error) {
    console.error('Error fetching stop name:', error);
    return `Megálló ${stopId}`;
  }
};

// Function to translate current status
const translateStatus = (status) => {
  const statusTranslations = {
    'IN_TRANSIT_TO': 'Útban a megállóhoz',
    'INCOMING_AT': 'Közeledik a megállóhoz',
    'STOPPED_AT': 'Megállónál',
    'SCHEDULED': 'Ütemezett',
    'UNSCHEDULED': 'Nem ütemezett'
  };
  
  return statusTranslations[status] || status;
};

// Komponens a térkép automatikus zoom-olásához
function AutoFitBounds({ currentStopId, stopPosition }) {
  const map = useMap();
  const [lastStopId, setLastStopId] = useState(currentStopId);
  const [hasAutoFitted, setHasAutoFitted] = useState(false);
  
  useEffect(() => {
    // Ha új megálló lett kiválasztva, reseteljük az auto-fit státuszt
    if (currentStopId !== lastStopId) {
      setHasAutoFitted(false);
      setLastStopId(currentStopId);
    }
  }, [currentStopId, lastStopId]);
  
  useEffect(() => {
    if (!hasAutoFitted && stopPosition) {
      // Egyszerűen a megállóra zoom-olunk, 3 szinttel kijebb a legközelebbi zoomtól
      map.setView([stopPosition.lat, stopPosition.lng], 15, {
        animate: true,
        duration: 1
      });
      
      setHasAutoFitted(true); // Jelöljük, hogy már megtörtént az auto-fit
    }
  }, [stopPosition, map, hasAutoFitted]);
  
  return null; // Ez egy invisible komponens
}

function App() {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [vehiclePositions, setVehiclePositions] = useState([]);
  const [debugLogged, setDebugLogged] = useState(false);
  const [stopNames, setStopNames] = useState({});
  const [mainStopName, setMainStopName] = useState(null);
  const [currentStopId, setCurrentStopId] = useState(DEFAULT_STOP_ID);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentStopPosition, setCurrentStopPosition] = useState(null);
  const [siblingStop, setSiblingStop] = useState(null);
  const [stopDirections, setStopDirections] = useState({});
  const searchContainerRef = useRef(null);

  const fetchDepartures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching departures...');
      
      const response = await fetch(
        `${BKK_API_BASE}/arrivals-and-departures-for-stop.json?key=${API_KEY}&version=3&appVersion=apiary-1.0&includeReferences=routes,trips&stopId=${currentStopId}&minutesBefore=0&minutesAfter=60`
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
            // Remove BKK_ prefix and csak a leading nullákat távolítjuk el
            let cleanRouteId = routeId.replace('BKK_', '');
            cleanRouteId = cleanRouteId.replace(/^0+(\d)/, '$1'); // 0164B -> 164B
            routeShortName = cleanRouteId || routeId.replace('BKK_', '');
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
            displayTime: timeUntilDeparture <= 0 ? 'MOST' : `${timeUntilDeparture} perc`,
            tripId: tripId, // Mentjük a trip ID-t is a vehicle pozíciók párosításához
            vehicleType: route?.type || 'BUS', // Jármű típusa
            isNightBus: route?.color === '000000' || route?.style?.vehicleIcon?.name === 'night-bus' || route?.style?.groupId === 6 // Éjszakai busz ellenőrzés
          };
        })
        .filter(dep => dep.minutesUntil >= 0 && dep.minutesUntil <= 60)
        .sort((a, b) => a.minutesUntil - b.minutesUntil);
        
        console.log('Final departures:', departures);
        setDepartures(departures);
        
        // Find sibling stop
        findSiblingStop();
        
        setLastUpdated(new Date());
        setLoading(false);
        return; // Exit successfully
      }
      
      throw new Error('Invalid API response structure');
      
    } catch (err) {
      console.error('API error:', err);
      setError('Hiba az API lekérdezésben');
      setDepartures([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMainStopName = async () => {
    try {
      const stopName = await getStopName(currentStopId);
      setMainStopName(stopName);
      console.log('Main stop name loaded:', stopName);
    } catch (error) {
      console.error('Error loading main stop name:', error);
      setMainStopName(`Megálló ${currentStopId.replace('BKK_', '')}`);
    }
  };

  const loadStopPosition = async (stopId) => {
    try {
      // Initialize stops data if not loaded yet
      if (!window.stopsData) {
        const response = await fetch('/stops.txt');
        const text = await response.text();
        const lines = text.split('\n');
        
        // Parse CSV data properly handling quoted strings
        window.stopsData = {};
        window.stopsPositions = {};
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
            
            if (parts.length >= 4) {
              const stopIdFromFile = parts[0].replace(/"/g, ''); // Remove quotes
              const stopName = parts[1].replace(/"/g, ''); // Remove quotes
              const stopLat = parseFloat(parts[2]);
              const stopLon = parseFloat(parts[3]);
              
              window.stopsData[stopIdFromFile] = stopName;
              if (!isNaN(stopLat) && !isNaN(stopLon)) {
                window.stopsPositions[stopIdFromFile] = { lat: stopLat, lng: stopLon };
              }
            }
          }
        }
        console.log('Loaded stops positions:', Object.keys(window.stopsPositions).length, 'stops with coordinates');
      }

      // Clean the stopId - remove BKK_ prefix
      let cleanStopId = stopId.replace('BKK_', '').replace(/^D/, ''); // Remove BKK_ prefix and D prefix
      
      // Try to find the stop position
      const position = window.stopsPositions[cleanStopId];
      
      if (position) {
        console.log('Found stop position:', position, 'for stopId:', stopId, '(clean:', cleanStopId, ')');
        setCurrentStopPosition(position);
      } else {
        console.log('Stop position not found for:', stopId, '(clean:', cleanStopId, ')');
        setCurrentStopPosition(null);
      }
      
    } catch (error) {
      console.error('Error loading stop position:', error);
      setCurrentStopPosition(null);
    }
  };

  const loadStopDirection = async (stopId) => {
    try {
      // Check if we already have the direction cached
      if (stopDirections[stopId]) {
        return stopDirections[stopId];
      }

      // Get stop position first
      const position = window.stopsPositions?.[stopId.replace('BKK_', '').replace(/^D/, '')];
      if (!position) {
        console.log('No position found for stop direction lookup:', stopId);
        return null;
      }

      // Fetch stop details from BKK API
      const response = await fetch(
        `${BKK_API_BASE}/stops-for-location.json?key=${API_KEY}&version=3&appVersion=apiary-1.0&lat=${position.lat}&lon=${position.lng}&radius=50`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.data?.list) {
        // Find the exact stop by ID
        const stop = data.data.list.find(s => s.id === stopId);
        if (stop && stop.direction) {
          const direction = parseFloat(stop.direction);
          console.log('Found stop direction:', direction, 'for stopId:', stopId);
          
          // Cache the direction
          setStopDirections(prev => ({
            ...prev,
            [stopId]: direction
          }));
          
          return direction;
        }
      }
      
      console.log('No direction found for stop:', stopId);
      return null;
      
    } catch (error) {
      console.error('Error loading stop direction:', error);
      return null;
    }
  };

  const loadStopNames = async (vehicles) => {
    const newStopNames = { ...stopNames };
    let hasNewNames = false;
    
    // Load stop names for all unique stop IDs
    const uniqueStopIds = [...new Set(vehicles.map(v => v.stopId).filter(Boolean))];
    
    for (const stopId of uniqueStopIds) {
      if (!newStopNames[stopId]) {
        try {
          console.log('Loading stop name for:', stopId);
          const stopName = await getStopName(stopId);
          newStopNames[stopId] = stopName;
          hasNewNames = true;
          console.log('Loaded stop name:', stopId, '->', stopName);
        } catch (error) {
          console.error('Error loading stop name for', stopId, ':', error);
        }
      }
    }
    
    if (hasNewNames) {
      setStopNames(newStopNames);
      console.log('Updated stop names:', newStopNames);
    }
  };

  const fetchVehiclePositions = async () => {
    try {
      console.log('Fetching vehicle positions from GTFS-RT API...');
      
      const response = await fetch(
        `https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full/VehiclePositions.txt?key=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.text();
      console.log('Vehicle positions raw response:', data);
      
      // Parse the GTFS-RT text data - simplified approach
      console.log('Raw GTFS-RT data sample:', data.substring(0, 1000));
      
      // Split into entities
      const entities = data.split('entity {').slice(1); // Remove first empty element
      const vehicles = [];
      
      for (let entity of entities) {
        const vehicle = {};
        
        // Extract trip_id
        const tripIdMatch = entity.match(/trip_id:\s*"([^"]+)"/);
        if (tripIdMatch) {
          vehicle.tripId = tripIdMatch[1];
        }
        
        // Extract route_id (raw formában is eltároljuk)
        const routeIdMatch = entity.match(/route_id:\s*"([^"]+)"/);
        if (routeIdMatch) {
          vehicle.rawRouteId = routeIdMatch[1]; // Eredeti formátum megtartása
          let routeId = routeIdMatch[1].replace('BKK_', '');
          // Csak a leading nullákat távolítjuk el, de a betűket megtartjuk
          routeId = routeId.replace(/^0+(\d)/, '$1'); // 0164B -> 164B
          vehicle.routeId = routeId || routeIdMatch[1];
        }
        
        // Extract vehicle id
        const vehicleIdMatch = entity.match(/vehicle\s*{\s*id:\s*"([^"]+)"/);
        if (vehicleIdMatch) {
          vehicle.id = vehicleIdMatch[1];
        }
        
        // Extract position
        const latMatch = entity.match(/latitude:\s*([\d.-]+)/);
        const lngMatch = entity.match(/longitude:\s*([\d.-]+)/);
        const bearingMatch = entity.match(/bearing:\s*([\d.-]+)/);
        
        if (latMatch && lngMatch) {
          vehicle.lat = parseFloat(latMatch[1]);
          vehicle.lng = parseFloat(lngMatch[1]);
          if (bearingMatch) {
            vehicle.bearing = parseFloat(bearingMatch[1]);
          }
        }
        
        // Extract additional vehicle information
        const stopIdMatch = entity.match(/stop_id:\s*"([^"]+)"/);
        if (stopIdMatch) {
          vehicle.stopId = stopIdMatch[1];
        }
        
        const currentStatusMatch = entity.match(/current_status:\s*(\w+)/);
        if (currentStatusMatch) {
          vehicle.currentStatus = currentStatusMatch[1];
        }
        
        const licensePlateMatch = entity.match(/license_plate:\s*"([^"]+)"/);
        if (licensePlateMatch) {
          vehicle.licensePlate = licensePlateMatch[1];
        }
        
        const vehicleModelMatch = entity.match(/vehicle_model:\s*"([^"]+)"/);
        if (vehicleModelMatch) {
          vehicle.vehicleModel = vehicleModelMatch[1];
        }
        
        const doorOpenMatch = entity.match(/door_open:\s*(true|false)/);
        if (doorOpenMatch) {
          vehicle.doorOpen = doorOpenMatch[1] === 'true';
        }
        
        const vehicleLabelMatch = entity.match(/label:\s*"([^"]+)"/);
        if (vehicleLabelMatch) {
          vehicle.label = vehicleLabelMatch[1];
        }
        
        // Only add vehicles with required data
        if (vehicle.tripId && vehicle.lat && vehicle.lng) {
          // Add vehicle type information - will be matched with departures later
          vehicle.vehicleType = 'BUS'; // Default, will be updated when matched with departures
          vehicle.isNightBus = false; // Default, will be updated when matched with departures
          vehicles.push(vehicle);
        }
      }
      
      if (!debugLogged) {
        console.log('Parsed vehicles:', vehicles);
        console.log('Current departures for matching:', departures);
        setDebugLogged(true);
      }
      setVehiclePositions(vehicles);
      
    } catch (err) {
      console.error('Vehicle positions error:', err);
      setVehiclePositions([]);
    }
  };

  useEffect(() => {
    loadMainStopName(); // Load main stop name first
    loadStopPosition(currentStopId); // Load stop position
    loadStopDirection(currentStopId); // Load stop direction
    fetchDepartures();
    fetchVehiclePositions();
    setCountdown(5);
    
    const fetchInterval = setInterval(() => {
      fetchDepartures();
      fetchVehiclePositions();
      setCountdown(5);
    }, 5000); // Refresh every 5 seconds
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 5);
    }, 1000); // Update countdown every second
    
    return () => {
      clearInterval(fetchInterval);
      clearInterval(countdownInterval);
    };
  }, [currentStopId]); // Re-run when stop ID changes

  // Load stop names when vehicle positions change
  useEffect(() => {
    if (vehiclePositions.length > 0) {
      loadStopNames(vehiclePositions);
    }
  }, [vehiclePositions]);

  // Search functionality
  const searchStops = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      // Initialize stops data if not loaded yet
      if (!window.stopsData) {
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
      }

      // Search through stops
      const results = [];
      const queryLower = query.toLowerCase();
      
      for (const [stopId, stopName] of Object.entries(window.stopsData)) {
        if (stopName.toLowerCase().includes(queryLower)) {
          results.push({
            stopId: `BKK_${stopId}`,
            stopName: stopName
          });
          
          if (results.length >= 10) break; // Limit results
        }
      }
      
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching stops:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchStops(query);
  };

  const selectStop = (stopId, stopName) => {
    setCurrentStopId(stopId);
    setMainStopName(stopName);
    loadStopPosition(stopId); // Load new stop position
    loadStopDirection(stopId); // Load new stop direction
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
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
      const cleanStopId = currentStopId.replace('BKK_', '');
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
              id: `BKK_${prevStopId}`,
              name: prevStopName
            });
            return;
          }
          
          // Check if next stop has the same name
          const nextStopName = window.stopsData[nextStopId];
          if (nextStopName === currentStopName) {
            console.log(`Found sibling stop: ${nextStopId} (${nextStopName})`);
            setSiblingStop({
              id: `BKK_${nextStopId}`,
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
      selectStop(siblingStop.id, siblingStop.name);
    }
  };

  // Handle click outside search container
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          
          // Column 2: Direction (mobilon rövidebb, asztali gépen megfelelő)
          const directionMaxLength = window.innerWidth <= 768 ? 12 : 16;
          const directionColumn = direction.substring(0, directionMaxLength).padEnd(directionMaxLength, ' ');
          
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
      {/* Search Input */}
      <div className="search-container" ref={searchContainerRef}>
        <input
          type="text"
          className="search-input"
          placeholder="Keresés megállók között... (min. 3 karakter)"
          value={searchQuery}
          onChange={handleSearchInput}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowSearchResults(true);
            }
          }}
        />
        {showSearchResults && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result, index) => (
              <div
                key={result.stopId}
                className="search-result-item"
                onClick={() => selectStop(result.stopId, result.stopName)}
              >
                <span className="stop-name">{result.stopName}</span>
                <span className="stop-id">{result.stopId}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dotmatrix Display */}
      <div className="dotmatrix-container">
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div className="dotmatrix-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px'}}>
            <div style={{textAlign: 'left'}}>
              <h1 style={{color: 'white', margin: 0}}>{mainStopName || currentStopId.replace('BKK_', '')}</h1>
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
      </div>
      
      {/* Map Display */}
      <div className="map-container">
        <h2 style={{color: 'white', textAlign: 'center', marginBottom: '20px'}}>Járművek valós idejű helyzete</h2>
        <MapContainer 
          center={[47.5, 19.05]} 
          zoom={13} 
          style={{ 
            height: window.innerWidth <= 768 ? '300px' : '400px', 
            width: '100%' 
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Automatikus zoom a megállóra */}
          <AutoFitBounds 
            currentStopId={currentStopId}
            stopPosition={currentStopPosition}
          />

          {/* Megálló marker */}
          {currentStopPosition && (
            <Marker 
              position={[currentStopPosition.lat, currentStopPosition.lng]}
              icon={createStopIcon(stopDirections[currentStopId])}
            >
              <Popup>
                <div>
                  <strong>{mainStopName || currentStopId.replace('BKK_', '')}</strong>
                  <br />
                  <small>Megálló ID: {currentStopId}</small>
                  {stopDirections[currentStopId] && (
                    <>
                      <br />
                      <small>Irány: {Math.round(stopDirections[currentStopId])}°</small>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Busz markerek - csak azok, amik a kijelzőn is láthatók */}
          {(() => {
            const filteredVehicles = vehiclePositions.filter(vehicle => 
              departures.some(dep => dep.tripId === vehicle.tripId)
            );
            
            // Intelligens párosítás - BKK_ prefix nélkül
            const smartFilteredVehicles = vehiclePositions.filter(vehicle => {
              // Normalizáljuk a tripId-ket (BKK_ prefix eltávolítása)
              const vehicleTripId = vehicle.tripId?.replace('BKK_', '') || '';
              
              const tripIdMatch = departures.some(dep => {
                const depTripId = dep.tripId?.replace('BKK_', '') || '';
                return depTripId === vehicleTripId;
              });
              
              // Ha nincs tripId egyezés, próbáljuk routeId alapján
              const routeIdMatch = departures.some(dep => dep.routeId === vehicle.routeId);
              
              return tripIdMatch || routeIdMatch;
            });
            
            // Debug log csak egyszer
            if (!debugLogged && vehiclePositions.length > 0 && departures.length > 0) {
              console.log('=== DETAILED TRIP ID MATCHING DEBUG ===');
              console.log('Departures tripIds (raw):', departures.map(d => d.tripId));
              console.log('Vehicle tripIds (raw):', vehiclePositions.map(v => v.tripId));
              
              console.log('Departures tripIds (normalized):', departures.map(d => d.tripId?.replace('BKK_', '')));
              console.log('Vehicle tripIds (normalized):', vehiclePositions.map(v => v.tripId?.replace('BKK_', '')));
              
              // Részletes párosítás teszt
              vehiclePositions.slice(0, 3).forEach(vehicle => {
                const vehicleTripId = vehicle.tripId?.replace('BKK_', '') || '';
                console.log(`Vehicle ${vehicle.id} tripId: "${vehicleTripId}"`);
                
                const matches = departures.filter(dep => {
                  const depTripId = dep.tripId?.replace('BKK_', '') || '';
                  return depTripId === vehicleTripId;
                });
                
                console.log(`  Matches:`, matches.length > 0 ? matches.map(m => m.routeId) : 'NONE');
              });
              
              console.log('Smart filtered vehicles:', smartFilteredVehicles);
              console.log('=========================================');
            }
            
            return smartFilteredVehicles;
          })().map((vehicle) => {
            // Find matching departure to get vehicle type
            const matchingDeparture = departures.find(dep => 
              dep.tripId?.replace('BKK_', '') === vehicle.tripId?.replace('BKK_', '')
            );
            
            const vehicleType = matchingDeparture?.vehicleType || vehicle.vehicleType || 'BUS';
            const isNightBus = matchingDeparture?.isNightBus || vehicle.isNightBus || false;
            
            return (
              <Marker 
                key={vehicle.id} 
                position={[vehicle.lat, vehicle.lng]}
                icon={createVehicleIcon(vehicle.bearing, vehicleType, isNightBus)}
              >
              <Popup>
                <div>
                  <div>
                    {(() => {
                      // Get the correct icon for the popup
                      let popupIconSrc = '/BKV_busz_symbol.svg.png';
                      let popupAltText = 'Bus';
                      
                      if (isNightBus) {
                        popupIconSrc = '/BKK_night_line_logo.svg.png';
                        popupAltText = 'Night Bus';
                      } else {
                        switch (vehicleType) {
                          case 'TRAM':
                            popupIconSrc = '/Logo_tramway-budapest.svg.png';
                            popupAltText = 'Tram';
                            break;
                          case 'TROLLEYBUS':
                            popupIconSrc = '/Budapest_trolleybus_symbol.svg.png';
                            popupAltText = 'Trolleybus';
                            break;
                          case 'SUBWAY':
                            popupIconSrc = '/BKV_busz_symbol.svg.png';
                            popupAltText = 'Metro';
                            break;
                          case 'RAIL':
                            popupIconSrc = '/Budapest_hev_symbol.svg.png';
                            popupAltText = 'HEV';
                            break;
                          case 'BUS':
                          default:
                            popupIconSrc = '/BKV_busz_symbol.svg.png';
                            popupAltText = 'Bus';
                            break;
                        }
                      }
                      
                      return (
                        <img 
                          src={popupIconSrc} 
                          alt={popupAltText} 
                          style={{height: '16px', width: '16px', verticalAlign: 'middle', marginRight: '4px'}} 
                        />
                      );
                    })()}
                    <strong>Járat:</strong> {(() => {
                      // Megkeressük a megfelelő departure-t a tripId alapján, hogy megkapjuk a helyes routeId-t
                      const matchingDeparture = departures.find(dep => 
                        dep.tripId?.replace('BKK_', '') === vehicle.tripId?.replace('BKK_', '')
                      );
                      return matchingDeparture ? matchingDeparture.routeId : vehicle.routeId;
                    })()}
                  </div>
                  {vehicle.label && <div><strong>Célállomás:</strong> {vehicle.label}</div>}
                  {vehicle.stopId && <div><strong>Következő megálló:</strong> {stopNames[vehicle.stopId] || `Megálló ${vehicle.stopId}`}</div>}
                  {vehicle.currentStatus && <div><strong>Státusz:</strong> {translateStatus(vehicle.currentStatus)}</div>}
                  {vehicle.licensePlate && <div><strong>Rendszám:</strong> {vehicle.licensePlate}</div>}
                  {vehicle.vehicleModel && <div><strong>Típus:</strong> {vehicle.vehicleModel}</div>}
                  {vehicle.doorOpen !== undefined && <div><strong>Ajtók:</strong> {vehicle.doorOpen ? 'Nyitva' : 'Zárva'}</div>}
                  {vehicle.bearing && <div><strong>Irány:</strong> {Math.round(vehicle.bearing)}°</div>}
                </div>
              </Popup>
            </Marker>
            );
          })}
        </MapContainer>
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

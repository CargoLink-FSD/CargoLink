import React, { useEffect, useRef } from 'react';
import '../../styles/MapDisplay.css';

// Normalize coords to Leaflet [lat, lng]
const toLatLng = (coords) => {
  if (!coords || coords.length < 2) return null;
  const a = Number(coords[0]), b = Number(coords[1]);
  if (isNaN(a) || isNaN(b)) return null;
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  if (a > 50 && b < 40) return [b, a];
  return [a, b];
};

// Convert coords to OSRM "lng,lat" string
const toOsrmCoord = (coords) => {
  const ll = toLatLng(coords);
  if (!ll) return null;
  return `${ll[1]},${ll[0]}`;
};

const isStopCompleted = (stop) => ['Completed', 'Skipped'].includes(stop?.status);

const formatTime = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatFullDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const getStopTimeLabel = (stop) => {
  const actual = stop?.actual_departure_at || stop?.actual_arrival_at;
  if (isStopCompleted(stop) && actual) {
    return `Actual: ${formatFullDate(actual)}`;
  }
  const eta = stop?.eta_at || stop?.scheduled_arrival_at;
  return `ETA: ${formatFullDate(eta)}`;
};

/**
 * MapDisplay component - Renders trip/order map with route and markers in a panel
 * @param {Object} props
 * @param {Array} props.stops - Trip stops with coordinates
 * @param {Array} props.currentLocation - [lng, lat] driver location
 * @param {String} props.tripStatus - 'Active', 'Scheduled', 'Completed', 'Cancelled'
 * @param {String} props.orderStatus - 'Started', 'In Transit', 'Payment Pending' (for track order)
 * @param {Boolean} props.showLive - Whether to show current location
 * @param {String} props.routeMode - 'full' (all stops), 'active' (completed → current → remaining), 'trackorder' (logic-based)
 * @param {Object} props.stats - Optional stats object { distance, nextEta, startedAt, totalTime, vehicle, stops }
 */
const MapDisplay = ({ 
  stops = [], 
  currentLocation, 
  tripStatus = 'Scheduled', 
  orderStatus, 
  showLive = true, 
  routeMode = 'full',
  stats = {}
}) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const [mapReady, setMapReady] = React.useState(false);
  

  // Load Leaflet
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) { setMapReady(true); return; }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.L) { setMapReady(true); clearInterval(check); }
      }, 100);
      return () => clearInterval(check);
    }
  }, []);

  // Render map and compute ETAs from route (ensures markers render with ETAs)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !stops.length) return;

    const L = window.L;
    let map = leafletMap.current;
    if (!map) {
      map = L.map(mapRef.current, { zoomControl: true, preferCanvas: true, zoomSnap: 0.5 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap',
      }).addTo(map);
      map.setView([20.5, 78.9], 5);
      leafletMap.current = map;
    }

    // Clear markers
    markersRef.current.forEach((m) => { if (m && typeof m.remove === 'function') m.remove(); });
    markersRef.current = [];

    const validStops = stops.filter(s => s.address?.coordinates?.length === 2);
    if (!validStops.length) return;

    // Build routeCoordList and meta mapping (so we can map route points back to stops)
    const currentLoc = toLatLng(currentLocation);
    const routeCoordList = [];
    const routeMeta = []; // each entry: { type: 'stop'|'current', stopIdx: number|null }

    const pushPoint = (coords, meta) => { routeCoordList.push(coords); routeMeta.push(meta); };

    if (routeMode === 'active' && tripStatus === 'Active' && currentLoc) {
      const completed = validStops.filter(isStopCompleted);
      const remaining = validStops.filter((s) => !isStopCompleted(s));
      completed.forEach((s) => pushPoint(s.address.coordinates, { type: 'stop', stopIdx: validStops.indexOf(s) }));
      pushPoint([currentLoc[1], currentLoc[0]], { type: 'current', stopIdx: null });
      remaining.forEach((s) => pushPoint(s.address.coordinates, { type: 'stop', stopIdx: validStops.indexOf(s) }));
    } else if (routeMode === 'trackorder' && showLive && currentLoc) {
      const pickup = validStops.find((s) => s.type === 'Pickup');
      const dropoff = [...validStops].reverse().find((s) => s.type === 'Dropoff');
      if (orderStatus === 'Started' && pickup) {
        pushPoint([currentLoc[1], currentLoc[0]], { type: 'current', stopIdx: null });
        pushPoint(pickup.address.coordinates, { type: 'stop', stopIdx: validStops.indexOf(pickup) });
        validStops.filter(s => s.type !== 'Pickup').forEach(s => pushPoint(s.address.coordinates, { type: 'stop', stopIdx: validStops.indexOf(s) }));
      } else if ((orderStatus === 'In Transit' || orderStatus === 'Payment Pending') && dropoff) {
        pushPoint([currentLoc[1], currentLoc[0]], { type: 'current', stopIdx: null });
        pushPoint(dropoff.address.coordinates, { type: 'stop', stopIdx: validStops.indexOf(dropoff) });
      } else {
        validStops.forEach((s) => pushPoint(s.address.coordinates, { type: 'stop', stopIdx: validStops.indexOf(s) }));
      }
    } else {
      validStops.forEach((s) => pushPoint(s.address.coordinates, { type: 'stop', stopIdx: validStops.indexOf(s) }));
    }

    const coords = routeCoordList.map(toOsrmCoord).filter(Boolean).join(';');

    const finalizeAndAddMarkers = (etaMap, routeCoords) => {
      // Replace route only when new route is ready
      if (routeCoords) {
        if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }
        routeRef.current = L.polyline(routeCoords, { color: '#6366f1', weight: 4, opacity: 0.85 }).addTo(map);
      }

      // Add stop markers with computed ETAs (etaMap maps stop._id -> Date)
      validStops.forEach((stop, idx) => {
        const ll = toLatLng(stop.address.coordinates);
        if (!ll) return;
        const isPickup = stop.type === 'Pickup';
        const isCompleted = isStopCompleted(stop);

        let etaTime = null;
        if (isCompleted) {
          const actual = stop?.actual_start_at || stop?.actual_departure_at || stop?.actual_arrival_at;
          etaTime = formatTime(actual);
        } else if (etaMap && stop._id && etaMap[stop._id]) {
          etaTime = formatTime(etaMap[stop._id]);
        }

        const markerColor = isPickup ? '#22c55e' : '#ef4444';
        const markerBg = isCompleted ? '#888' : markerColor;

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: 30px; 
              height: 30px; 
              background: ${markerBg}; 
              border-radius: 50%; 
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
              font-size: 14px;
            ">
              ${isCompleted ? '✓' : idx + 1}
            </div>
            ${etaTime ? `<div style="
              position: absolute;
              top: -22px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0,0,0,0.8);
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 11px;
              white-space: nowrap;
              font-weight: 600;
              pointer-events: none;
            ">${etaTime}</div>` : ''}
          `,
          iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15],
        });

        const marker = L.marker(ll, { icon }).addTo(map);
        marker.bindPopup(
          `<b>${stop.address?.city || 'Stop'}</b><br/>` +
          `${stop.type} · ${stop.status || ''}<br/>` +
          `${getStopTimeLabel(stop)}`
        );
        markersRef.current.push(marker);
      });

      // Add current location marker with pulse effect
      if (showLive && currentLocation?.length === 2) {
        const cll = toLatLng(currentLocation);
        if (cll) {
          const currentIcon = L.divIcon({
            className: '',
            html: `
              <div style="
                width: 16px; 
                height: 16px; 
                background: #3b82f6; 
                border-radius: 50%; 
                border: 3px solid white;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(59,130,246,0.4);
                position: relative;
              ">
                <div style="position: absolute; inset: -8px; border-radius: 50%; background: rgba(59,130,246,0.15); animation: livePulse 2s ease-in-out infinite"></div>
              </div>
            `,
            iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8],
          });
          if (currentMarkerRef.current) {
            currentMarkerRef.current.setLatLng(cll);
          } else {
            currentMarkerRef.current = L.marker(cll, { icon: currentIcon }).addTo(map).bindPopup('Driver Location');
          }
          markersRef.current.push({ getLatLng: () => L.latLng(cll) });
        }
      }

      // Fit bounds
      if (markersRef.current.length > 0) {
        const bounds = L.latLngBounds(markersRef.current.map(m => m.getLatLng()));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    };

    // If we have a valid OSRM route to fetch, do it and compute ETAs by mapping route legs to routeMeta
    if (coords && coords.includes(';')) {
      fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes?.length) {
            const route = data.routes[0];
            const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);

            const etaMap = {};
            if (route.legs && route.legs.length > 0) {
              let cumulative = 0;
              const now = Date.now();
              // for each leg i, after leg i we're at route point index i+1
              route.legs.forEach((leg, i) => {
                cumulative += leg.duration || 0;
                const pointIdx = i + 1;
                const meta = routeMeta[pointIdx];
                if (meta && meta.type === 'stop' && typeof meta.stopIdx === 'number') {
                  const stop = validStops[meta.stopIdx];
                  if (stop && stop._id) etaMap[stop._id] = new Date(now + cumulative * 1000);
                }
              });
            }

            finalizeAndAddMarkers(etaMap, routeCoords);
          } else {
            finalizeAndAddMarkers(null, null);
          }
        })
        .catch(() => { finalizeAndAddMarkers(null, null); });
    } else {
      // no route: still add markers without ETAs
      finalizeAndAddMarkers(null, null);
    }
  }, [mapReady, stops, currentLocation, tripStatus, orderStatus, showLive, routeMode]);

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
        }
        .map-display-container {
          width: 100%;
          height: 100%;
          min-height: 300px;
          border: none;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
        }
      `}</style>
      <div className="map-display-panel">
        <div className="map-display-wrapper">
          <div className="map-display-container" ref={mapRef} />
        </div>
        
        {
          <div className="map-display-stats">
            {stats.distance !== undefined && (
              <div className="map-display-stat-item">
                <span className="map-display-stat-label">Distance</span>
                <span>{stats.distance || '—'}</span>
              </div>
            )}
            {stats.nextEta !== undefined && (
              <div className="map-display-stat-item">
                <span className="map-display-stat-label">Next ETA</span>
                <span>{stats.nextEta || '—'}</span>
              </div>
            )}
            {stats.startedAt !== undefined && (
              <div className="map-display-stat-item">
                <span className="map-display-stat-label">Started At</span>
                <span>{stats.startedAt || '—'}</span>
              </div>
            )}
            {stats.totalTime !== undefined && (
              <div className="map-display-stat-item">
                <span className="map-display-stat-label">Total Time</span>
                <span>{stats.totalTime || '—'}</span>
              </div>
            )}
            {stats.vehicle !== undefined && (
              <div className="map-display-stat-item">
                <span className="map-display-stat-label">Vehicle</span>
                <span>{stats.vehicle || '—'}</span>
              </div>
            )}
            {stats.stops !== undefined && (
              <div className="map-display-stat-item">
                <span className="map-display-stat-label">Stops</span>
                <span>{stats.stops || '—'}</span>
              </div>
            )}
          </div>
        }
      </div>
    </>
  );
};

export default MapDisplay;

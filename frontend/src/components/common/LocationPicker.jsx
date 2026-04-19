import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../../styles/LocationPicker.css';
import { MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

const LocationPicker = ({ address, coordinates, onLocationSet }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize leaflet script & css
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) {
      setMapReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

const placeMarker = useCallback((lat, lng) => {
  if (!leafletMap.current || !window.L) return;
  const L = window.L;

  const createIcon = () => L.divIcon({
  className: '',
  html: `
            <div style="
              width: 15px; 
              height: 15px; 
              background: #6f0cd7; 
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
              ${''}
            </div>
          `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

  if (markerRef.current) {
    markerRef.current.setLatLng([lat, lng]);
  } else {
    markerRef.current = L.marker([lat, lng], {
      icon: createIcon(),
      draggable: true,
    }).addTo(leafletMap.current);

    markerRef.current.on('dragend', (ev) => {
      const p = ev.target.getLatLng();
      onLocationSet?.({ coordinates: [p.lng, p.lat] });
    });
  }
}, [onLocationSet]);

  // Map initialization
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (leafletMap.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Initial center (India)
    map.setView([20.5937, 78.9629], 4);
    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
  }, [mapReady]);

  // Automatically fetch from Nominatim IF no coordinates exist and city/state are typed
  useEffect(() => {
    if (!address) return;
    const { city, state } = address;
    if (!city || !state) return;

    // If we ALREADY have coordinates from a saved address dropdown or a recent geocode on these same inputs, 
    // we don't necessarily want to re-fetch unless they actually typed a new city/state.
    // However, tracking that is tricky. The customer requested: "only display the location from the entered city and state... when using saved address just dont use the geocoding, use the saved coordinates."
    // If coordinates are set via dropdown, `coordinates` prop is updated. We should skip geocoding if it's already solved via Dropdown.
    // But if someone types, `coordinates` might still hold old ones until updated. We rely on the parent clearing coords when a user types, OR we just geocode when coords are null.
    // Actually, `usePlaceOrder` doesn't clear coordinates when typing, so let's enforce a Nominatim lookup only if (1) `address.isSaved` is false (we can guess this if we don't have it) OR (2) let's just make `usePlaceOrder` blank coordinates when manual typing happens.
    // Let's implement background geocoding simply:

    if (coordinates) return; // Wait, if coordinates are present, don't geocode! This satisfies "when using saved address just dont use the geocoding, use the saved coordinates."

    const query = `${city}, ${state}`.trim();
    if (query.length < 3) return;

    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'CargoLink/1.0' } });
        const data = await res.json();

        if (data && data[0] && onLocationSet) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          onLocationSet({ coordinates: [lng, lat] });
        }
      } catch (err) {
        console.error('Nominatim geocode error:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [address?.city, address?.state, address, coordinates, onLocationSet]);

  // Handle setting the marker when we have coordinates
  useEffect(() => {
    if (!leafletMap.current || !coordinates || coordinates.length !== 2) return;
    placeMarker(coordinates[1], coordinates[0]);
    leafletMap.current.setView([coordinates[1], coordinates[0]], 12);
    // Ensure marker is draggable and updates parent when dragged
    if (markerRef.current && typeof markerRef.current.dragging === 'object') {
      try {
        markerRef.current.dragging.enable();
      } catch { /* ignore */ }
    }
  }, [coordinates, placeMarker]);

  // Map click to move pin
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;
    const map = leafletMap.current;
    const handleClick = (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      placeMarker(lat, lng);
      if (onLocationSet) onLocationSet({ coordinates: [lng, lat] });
    };
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [placeMarker, onLocationSet]);

  return (
    <div className="location-picker">
      <div style={{ position: 'relative', width: '100%' }}>
        <div className="lp-map-container" ref={mapRef} style={{ height: '300px', width: '100%', borderRadius: '8px', zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <div className="lp-coords">
            {coordinates && coordinates.length === 2
              ? `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`
              : 'No coords'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '6px' }}>
        {coordinates && coordinates.length === 2 ? (
          <div className="form-info" style={{ color: '#111827', fontSize: '0.95rem' }}>
            <strong>Coordinates:</strong>&nbsp;{coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
          </div>
        ) : (
          <div className="form-info" style={{ color: '#6b7280', fontSize: '0.92rem' }}>
            Coordinates will appear here after geocoding or map selection.
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPicker;

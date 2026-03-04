// src/components/common/LocationPicker.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../styles/LocationPicker.css';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * LocationPicker – inline Leaflet map for picking/confirming a geocoded location.
 *
 * Props:
 *  - label          (string)        "Pickup" | "Delivery"
 *  - address        (object)        { street, city, state, pin }
 *  - coordinates    ([lng,lat]|null)
 *  - onLocationSet  (fn)            ({ coordinates: [lng,lat], address })
 */
const LocationPicker = ({ label, address, coordinates, onLocationSet }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  // ─── Load Leaflet CDN ───
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

  // ─── Init map ───
  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    if (coordinates?.length === 2) {
      map.setView([coordinates[1], coordinates[0]], 14);
    } else {
      map.setView([20.5, 78.9], 5);
    }

    // Click to set location
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
      // Reverse geocode
      try {
        const res = await fetch(
          `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'CargoLink/1.0' } }
        );
        const data = await res.json();
        if (data && !data.error) {
          onLocationSet({
            coordinates: [lng, lat],
            address: {
              street: data.address?.road || data.address?.suburb || '',
              city: data.address?.city || data.address?.town || data.address?.village || '',
              state: data.address?.state || '',
              pin: data.address?.postcode || '',
            },
          });
        } else {
          onLocationSet({ coordinates: [lng, lat], address: null });
        }
      } catch {
        onLocationSet({ coordinates: [lng, lat], address: null });
      }
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Update marker when coordinates change from outside ───
  useEffect(() => {
    if (!leafletMap.current || !coordinates?.length) return;
    placeMarker(coordinates[1], coordinates[0]);
    leafletMap.current.setView([coordinates[1], coordinates[0]], 14);
  }, [coordinates]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeMarker = (lat, lng) => {
    const L = window.L;
    const map = leafletMap.current;
    if (!L || !map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `<div class="lp-marker"><span>📍</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);

      // Drag end → reverse geocode
      markerRef.current.on('dragend', async () => {
        const pos = markerRef.current.getLatLng();
        try {
          const res = await fetch(
            `${NOMINATIM_BASE}/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`,
            { headers: { 'User-Agent': 'CargoLink/1.0' } }
          );
          const data = await res.json();
          if (data && !data.error) {
            onLocationSet({
              coordinates: [pos.lng, pos.lat],
              address: {
                street: data.address?.road || data.address?.suburb || '',
                city: data.address?.city || data.address?.town || data.address?.village || '',
                state: data.address?.state || '',
                pin: data.address?.postcode || '',
              },
            });
          } else {
            onLocationSet({ coordinates: [pos.lng, pos.lat], address: null });
          }
        } catch {
          onLocationSet({ coordinates: [pos.lng, pos.lat], address: null });
        }
      });
    }
  };

  // ─── Geocode the current address text ───
  const handleFindOnMap = async () => {
    if (!address) return;
    const query = [address.street, address.city, address.state, address.pin].filter(Boolean).join(', ');
    if (!query.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`,
        { headers: { 'User-Agent': 'CargoLink/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        placeMarker(lat, lng);
        leafletMap.current?.setView([lat, lng], 14);
        onLocationSet({ coordinates: [lng, lat], address: null }); // keep existing address text
      }
    } catch {
      // silently ignore
    } finally {
      setSearching(false);
    }
  };

  // ─── Search with autocomplete ───
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${NOMINATIM_BASE}/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=in`,
          { headers: { 'User-Agent': 'CargoLink/1.0' } }
        );
        const data = await res.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  };

  const handleSelectSuggestion = async (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setSearchQuery(item.display_name);
    setShowSuggestions(false);

    placeMarker(lat, lng);
    leafletMap.current?.setView([lat, lng], 14);

    // Reverse geocode for structured address
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'CargoLink/1.0' } }
      );
      const data = await res.json();
      if (data && !data.error) {
        onLocationSet({
          coordinates: [lng, lat],
          address: {
            street: data.address?.road || data.address?.suburb || '',
            city: data.address?.city || data.address?.town || data.address?.village || '',
            state: data.address?.state || '',
            pin: data.address?.postcode || '',
          },
        });
      } else {
        onLocationSet({ coordinates: [lng, lat], address: null });
      }
    } catch {
      onLocationSet({ coordinates: [lng, lat], address: null });
    }
  };

  return (
    <div className="lp-container">
      <div className="lp-header">
        <span className="lp-label">📍 {label} Location on Map</span>
        {coordinates && (
          <span className="lp-coords">
            {coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}
          </span>
        )}
      </div>

      <div className="lp-controls">
        <div className="lp-search-wrap">
          <input
            type="text"
            className="lp-search-input"
            placeholder="Search location…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => suggestions.length && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="lp-suggestions">
              {suggestions.map((s, i) => (
                <li key={i} onMouseDown={() => handleSelectSuggestion(s)}>
                  {s.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="lp-find-btn"
          onClick={handleFindOnMap}
          disabled={searching}
        >
          {searching ? '...' : '📍 Find on Map'}
        </button>
      </div>

      <div ref={mapRef} className="lp-map" />
      <p className="lp-hint">Click on the map or drag the marker to adjust the exact location</p>
    </div>
  );
};

export default LocationPicker;

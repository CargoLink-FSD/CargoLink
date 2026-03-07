// src/components/common/LocationPicker.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { 
  INDIA_CENTER, 
  DEFAULT_MAP_OPTIONS,
  reverseGeocode,
  geocodeAddress,
  normalizeCoordinates 
} from '../../utils/googleMapsConfig';
import '../../styles/LocationPicker.css';

/**
 * LocationPicker – inline Google Map for picking/confirming a geocoded location.
 *
 * Props:
 *  - label          (string)        "Pickup" | "Delivery"
 *  - address        (object)        { street, city, state, pin }
 *  - coordinates    ({lat,lng}|null)
 *  - onLocationSet  (fn)            ({ coordinates: {lat,lng}, address })
 */
const LocationPicker = ({ label, address, coordinates, onLocationSet }) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [searching, setSearching] = useState(false);
  const autocompleteRef = useRef(null);

  // Convert GeoJSON [lng, lat] to Google Maps { lat, lng }
  const coordsToLatLng = useCallback((coords) => {
    if (!coords || coords.length < 2) return null;
    const normalized = normalizeCoordinates(coords);
    return normalized;
  }, []);

  // Initialize marker position from coordinates prop
  useEffect(() => {
    if (coordinates?.length === 2) {
      const latLng = coordsToLatLng(coordinates);
      if (latLng) {
        setMarkerPosition(latLng);
      }
    }
  }, [coordinates, coordsToLatLng]);

  // Handle map click - place marker and reverse geocode
  const handleMapClick = useCallback(async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    setMarkerPosition({ lat, lng });
    
    try {
      const addressData = await reverseGeocode(lat, lng);
      onLocationSet({
        coordinates: { lat, lng },
        address: {
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          pin: addressData.pin,
        },
      });
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      onLocationSet({ 
        coordinates: { lat, lng }, 
        address: null 
      });
    }
  }, [onLocationSet]);

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback(async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    setMarkerPosition({ lat, lng });
    
    try {
      const addressData = await reverseGeocode(lat, lng);
      onLocationSet({
        coordinates: { lat, lng },
        address: {
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          pin: addressData.pin,
        },
      });
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      onLocationSet({ 
        coordinates: { lat, lng }, 
        address: null 
      });
    }
  }, [onLocationSet]);

  // Handle "Find on Map" button - geocode current address
  const handleFindOnMap = async () => {
    if (!address) return;
    const query = [address.street, address.city, address.state, address.pin]
      .filter(Boolean)
      .join(', ');
    
    if (!query.trim()) return;

    setSearching(true);
    try {
      const result = await geocodeAddress(query);
      const latLng = { lat: result.lat, lng: result.lng };
      setMarkerPosition(latLng);
      
      if (map) {
        map.panTo(latLng);
        map.setZoom(14);
      }
      
      onLocationSet({ 
        coordinates: { lat: result.lat, lng: result.lng },
        address: null // Keep existing address text
      });
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setSearching(false);
    }
  };

  // Handle autocomplete place selection
  const handlePlaceSelect = useCallback(async () => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const latLng = { lat, lng };
    
    setMarkerPosition(latLng);
    
    if (map) {
      map.panTo(latLng);
      map.setZoom(14);
    }

    // Parse address components
    const addressComponents = place.address_components || [];
    const parsedAddress = {
      street: '',
      city: '',
      state: '',
      pin: '',
    };

    addressComponents.forEach(component => {
      if (component.types.includes('route') || component.types.includes('street_address')) {
        parsedAddress.street = component.long_name;
      } else if (component.types.includes('sublocality') && !parsedAddress.street) {
        parsedAddress.street = component.long_name;
      } else if (component.types.includes('locality')) {
        parsedAddress.city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        parsedAddress.state = component.long_name;
      } else if (component.types.includes('postal_code')) {
        parsedAddress.pin = component.long_name;
      }
    });

    onLocationSet({
      coordinates: { lat, lng },
      address: parsedAddress,
    });
  }, [map, onLocationSet]);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  if (loadError) {
    return <div className="lp-error">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="lp-loading">Loading map...</div>;
  }

  return (
    <div className="lp-container">
      <div className="lp-header">
        <span className="lp-label">{label} Location on Map</span>
        {markerPosition && (
          <span className="lp-coords">
            {markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)}
          </span>
        )}
      </div>

      <div className="lp-controls">
        <div className="lp-search-wrap">
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={handlePlaceSelect}
            options={{
              componentRestrictions: { country: 'in' },
              fields: ['address_components', 'geometry', 'formatted_address'],
            }}
          >
            <input
              type="text"
              className="lp-search-input"
              placeholder="Search location…"
            />
          </Autocomplete>
        </div>
        <button
          type="button"
          className="lp-find-btn"
          onClick={handleFindOnMap}
          disabled={searching}
        >
          {searching ? '...' : 'Find on Map'}
        </button>
      </div>

      <GoogleMap
        mapContainerClassName="lp-map"
        center={markerPosition || INDIA_CENTER}
        zoom={markerPosition ? 14 : 5}
        onClick={handleMapClick}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={DEFAULT_MAP_OPTIONS}
      >
        {markerPosition && (
          <Marker
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          />
        )}
      </GoogleMap>
      
      <p className="lp-hint">Click on the map or drag the marker to adjust the exact location</p>
    </div>
  );
};

export default LocationPicker;

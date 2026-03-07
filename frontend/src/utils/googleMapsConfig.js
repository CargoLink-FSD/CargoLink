// Google Maps Configuration and Utilities

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Google Maps libraries to load
export const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry', 'drawing'];

// Default map options
export const DEFAULT_MAP_OPTIONS = {
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: [], // Can add custom styling here
};

// India center coordinates
export const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
export const INDIA_BOUNDS = {
  north: 35.5,
  south: 6.5,
  west: 68.0,
  east: 97.5,
};

// Map theme/styling (optional - clean professional look)
export const MAP_STYLES = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

/**
 * Calculate distance between two points using Google Maps Geometry library
 * @param {object} point1 - { lat, lng }
 * @param {object} point2 - { lat, lng }
 * @returns {number} - distance in kilometers
 */
export function calculateDistance(point1, point2) {
  if (!window.google?.maps?.geometry) {
    console.error('Google Maps Geometry library not loaded');
    return 0;
  }

  const p1 = new google.maps.LatLng(point1.lat, point1.lng);
  const p2 = new google.maps.LatLng(point2.lat, point2.lng);
  const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
  return distanceInMeters / 1000; // Convert to km
}

/**
 * Convert [lng, lat] array to { lat, lng } object
 * Also handles cases where coordinates might be [lat, lng]
 */
export function normalizeCoordinates(coords) {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
  
  const a = Number(coords[0]);
  const b = Number(coords[1]);
  
  if (isNaN(a) || isNaN(b)) return null;
  
  // GeoJSON format is [lng, lat]
  // If first value is > 90 or < -90, it's longitude (so [lng, lat])
  // If first value is within [-90, 90] and second is larger, likely [lat, lng]
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    return { lat: b, lng: a };
  }
  
  // For Indian coordinates: lng is ~68-97, lat is ~8-37
  // If a > 50 and b < 40, it's likely [lng, lat]
  if (a > 50 && b < 40) {
    return { lat: b, lng: a };
  }
  
  // Assume [lat, lng] format
  return { lat: a, lng: b };
}

/**
 * Convert { lat, lng } object to [lng, lat] array (GeoJSON format)
 */
export function toGeoJSON(latLng) {
  if (!latLng || typeof latLng.lat !== 'number' || typeof latLng.lng !== 'number') {
    return null;
  }
  return [latLng.lng, latLng.lat];
}

/**
 * Create a custom marker icon HTML
 */
export function createMarkerIcon(color, label = '') {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
    scale: 8,
  };
}

/**
 * Fit map bounds to include all markers
 */
export function fitBoundsToMarkers(map, markers, padding = 50) {
  if (!map || !markers || markers.length === 0) return;
  
  const bounds = new google.maps.LatLngBounds();
  markers.forEach(marker => {
    if (marker.lat !== undefined && marker.lng !== undefined) {
      bounds.extend(new google.maps.LatLng(marker.lat, marker.lng));
    }
  });
  
  map.fitBounds(bounds, padding);
}

/**
 * Geocode an address using Google Maps Geocoding API
 */
export async function geocodeAddress(address) {
  if (!window.google?.maps) {
    throw new Error('Google Maps not loaded');
  }

  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { 
        address: address,
        componentRestrictions: { country: 'IN' }
      },
      (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          const addressComponents = results[0].address_components;
          
          // Parse address components
          const parsedAddress = {
            lat: location.lat(),
            lng: location.lng(),
            street: '',
            city: '',
            state: '',
            pin: '',
            formatted: results[0].formatted_address,
          };
          
          addressComponents.forEach(component => {
            if (component.types.includes('route') || component.types.includes('street_address')) {
              parsedAddress.street = component.long_name;
            } else if (component.types.includes('locality')) {
              parsedAddress.city = component.long_name;
            } else if (component.types.includes('administrative_area_level_1')) {
              parsedAddress.state = component.long_name;
            } else if (component.types.includes('postal_code')) {
              parsedAddress.pin = component.long_name;
            }
          });
          
          resolve(parsedAddress);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(lat, lng) {
  if (!window.google?.maps) {
    throw new Error('Google Maps not loaded');
  }

  const geocoder = new google.maps.Geocoder();
  const latlng = { lat, lng };
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const addressComponents = results[0].address_components;
        
        const parsedAddress = {
          street: '',
          city: '',
          state: '',
          pin: '',
          formatted: results[0].formatted_address,
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
        
        resolve(parsedAddress);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Get route between multiple waypoints using Directions Service
 */
export async function getDirections(waypoints, travelMode = 'DRIVING') {
  if (!window.google?.maps || !waypoints || waypoints.length < 2) {
    throw new Error('Invalid parameters for directions');
  }

  const directionsService = new google.maps.DirectionsService();
  
  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const waypointsArray = waypoints.slice(1, -1).map(wp => ({
    location: new google.maps.LatLng(wp.lat, wp.lng),
    stopover: true,
  }));

  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints: waypointsArray,
        travelMode: google.maps.TravelMode[travelMode],
        region: 'IN',
      },
      (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      }
    );
  });
}

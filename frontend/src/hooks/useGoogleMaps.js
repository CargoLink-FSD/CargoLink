// Custom hook for Google Maps integration
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from '../utils/googleMapsConfig';

/**
 * Custom hook to load Google Maps API
 * Returns loading state and whether the API is loaded
 */
export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    region: 'IN',
  });

  return {
    isLoaded,
    loadError,
  };
}

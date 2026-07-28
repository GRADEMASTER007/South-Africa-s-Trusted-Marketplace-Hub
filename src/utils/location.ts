import { Listing } from '../types';

// Default geographic centroids for South African cities/provinces for fallback pin placement
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Pretoria': { lat: -25.747, lng: 28.229 },
  'Johannesburg': { lat: -26.204, lng: 28.047 },
  'Centurion': { lat: -25.860, lng: 28.189 },
  'Cape Town': { lat: -33.925, lng: 18.424 },
  'Stellenbosch': { lat: -33.932, lng: 18.860 },
  'Somerset West': { lat: -34.083, lng: 18.850 },
  'George': { lat: -33.963, lng: 22.462 },
  'Durban': { lat: -29.858, lng: 31.021 },
  'Umhlanga': { lat: -29.728, lng: 31.086 },
  'Pietermaritzburg': { lat: -29.601, lng: 30.379 },
  'Gqeberha (Port Elizabeth)': { lat: -33.960, lng: 25.602 },
  'East London': { lat: -33.015, lng: 27.893 },
  'Bloemfontein': { lat: -29.118, lng: 26.214 },
  'Bethlehem': { lat: -28.231, lng: 28.314 },
  'Polokwane': { lat: -23.904, lng: 29.468 },
  'Mbombela (Nelspruit)': { lat: -25.475, lng: 30.969 },
  'Rustenburg': { lat: -25.667, lng: 27.242 },
  'Kimberley': { lat: -28.728, lng: 24.749 }
};

export const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Gauteng': { lat: -26.100, lng: 28.050 },
  'Western Cape': { lat: -33.925, lng: 18.424 },
  'KwaZulu-Natal': { lat: -29.858, lng: 31.021 },
  'Eastern Cape': { lat: -33.960, lng: 25.602 },
  'Free State': { lat: -29.118, lng: 26.214 },
  'Limpopo': { lat: -23.904, lng: 29.468 },
  'Mpumalanga': { lat: -25.475, lng: 30.969 },
  'North West': { lat: -25.667, lng: 27.242 },
  'Northern Cape': { lat: -28.728, lng: 24.749 }
};

export function getListingCoords(listing: Listing): { lat: number; lng: number } {
  if (listing.latitude && listing.longitude) {
    return { lat: listing.latitude, lng: listing.longitude };
  }
  if (listing.city && CITY_COORDINATES[listing.city]) {
    return CITY_COORDINATES[listing.city];
  }
  if (listing.province && PROVINCE_COORDINATES[listing.province]) {
    return PROVINCE_COORDINATES[listing.province];
  }
  return { lat: -29.000, lng: 25.000 }; // Center of South Africa
}

/**
 * Calculates distance in kilometers between two coordinates using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in kilometers into a human-readable string
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m away`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km away`;
  }
  return `${Math.round(km)} km away`;
}

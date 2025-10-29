import { useState, useEffect, useCallback } from 'react';

interface WeatherData {
  id: string;
  latitude: number;
  longitude: number;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
  aqi: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  source: string;
  airQualitySource: string | null;
  recordedAt: string;
  createdAt: string;
}

interface UseAutoWeatherFetchOptions {
  radiusKm?: number;
  autoFetch?: boolean;
  forceRefresh?: boolean;
}

export const useAutoWeatherFetch = (
  latitude: number | null,
  longitude: number | null,
  options: UseAutoWeatherFetchOptions = {}
) => {
  const { radiusKm = 5, autoFetch = true, forceRefresh = false } = options;
  
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchLocation, setLastFetchLocation] = useState<{lat: number, lng: number} | null>(null);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const shouldFetchForLocation = useCallback((lat: number, lng: number): boolean => {
    if (forceRefresh) return true;
    if (!lastFetchLocation) return true;
    
    // Check if user has moved more than half the radius (2.5km default)
    const distance = calculateDistance(lat, lng, lastFetchLocation.lat, lastFetchLocation.lng);
    return distance > (radiusKm / 2);
  }, [lastFetchLocation, radiusKm, forceRefresh, calculateDistance]);

  const fetchWeatherDataInRadius = useCallback(async (lat: number, lng: number) => {
    if (!shouldFetchForLocation(lat, lng)) {
      console.log(`Skipping weather fetch - user hasn't moved significantly from ${lastFetchLocation?.lat}, ${lastFetchLocation?.lng}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Auto-fetching weather data for location ${lat}, ${lng} within ${radiusKm}km radius`);
      
      // First, try to get existing data from the database within radius
      const existingDataResponse = await fetch(
        `/api/weather/radius?lat=${lat}&lng=${lng}&radius=${radiusKm}`
      );
      
      if (existingDataResponse.ok) {
        const existingData = await existingDataResponse.json();
        setWeatherData(existingData.data || []);
        
        // Check if we have recent data (less than 24 hours old)
        const now = new Date();
        const hasRecentData = existingData.data?.some((item: WeatherData) => {
          const recordedAt = new Date(item.recordedAt);
          const hoursDiff = (now.getTime() - recordedAt.getTime()) / (1000 * 60 * 60);
          return hoursDiff < 24;
        });

        if (hasRecentData && !forceRefresh) {
          console.log('Recent weather data found in database, skipping API fetch');
          setLastFetchLocation({ lat, lng });
          return;
        }
      }

      // If no recent data, fetch fresh data from APIs
      console.log('Fetching fresh weather data from APIs...');
      const freshDataResponse = await fetch(
        `/api/weather?lat=${lat}&lon=${lng}&refresh=true`
      );
      
      if (freshDataResponse.ok) {
        const freshData = await freshDataResponse.json();
        
        // Update the weather data array with the new data
        setWeatherData(prev => {
          const newData = [...prev];
          const existingIndex = newData.findIndex(item => 
            calculateDistance(item.latitude, item.longitude, lat, lng) < 1 // Within 1km
          );
          
          if (existingIndex >= 0) {
            newData[existingIndex] = freshData;
          } else {
            newData.push(freshData);
          }
          
          return newData;
        });
        
        setLastFetchLocation({ lat, lng });
        console.log(`✓ Successfully fetched weather data for ${lat}, ${lng}`);
      } else {
        throw new Error('Failed to fetch fresh weather data');
      }

    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, [radiusKm, forceRefresh, shouldFetchForLocation, lastFetchLocation, calculateDistance]);

  // Auto-fetch when location changes
  useEffect(() => {
    if (autoFetch && latitude !== null && longitude !== null) {
      fetchWeatherDataInRadius(latitude, longitude);
    }
  }, [latitude, longitude, autoFetch, fetchWeatherDataInRadius]);

  const manualRefresh = useCallback(() => {
    if (latitude !== null && longitude !== null) {
      fetchWeatherDataInRadius(latitude, longitude);
    }
  }, [latitude, longitude, fetchWeatherDataInRadius]);

  return {
    weatherData,
    loading,
    error,
    manualRefresh,
    lastFetchLocation,
  };
};
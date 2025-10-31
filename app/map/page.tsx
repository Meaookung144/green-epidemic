'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { 
  Cloud, 
  Thermometer, 
  Wind, 
  Droplets, 
  Eye,
  EyeOff,
  MapPin,
  Layers,
  RefreshCw,
  Flame
} from 'lucide-react';

// Dynamically import MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

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
  stationName?: string | null;
  recordedAt: string;
  createdAt: string;
}

export default function MapPage() {
  const { data: session } = useSession();
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>();
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [activeLayers, setActiveLayers] = useState({
    weather: true,
    pm25: true,
    covid19: false,
    flu: false,
    hotspots: true,
    allEnvironmentalData: false,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSyncingHotspots, setIsSyncingHotspots] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string>('');
  const [hotspotCount, setHotspotCount] = useState<number>(0);
  const userLocationRef = useRef<[number, number] | undefined>(userLocation);
  const hasRequestedLocation = useRef(false);
  const lastWeatherFetch = useRef<number>(0);

  useEffect(() => {
    // Try to get user's current location only once on mount
    if (!hasRequestedLocation.current) {
      getCurrentLocation();
      hasRequestedLocation.current = true;
    }
  }, []);

  useEffect(() => {
    // Update ref when userLocation changes
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    // Set up auto-refresh interval only once
    const interval = setInterval(() => {
      const currentLocation = userLocationRef.current;
      if (currentLocation) {
        fetchWeatherForLocation(currentLocation[0], currentLocation[1], true); // Force refresh
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, []); // Empty dependency array to run only once

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Round coordinates to reduce precision and prevent multiple calls for tiny differences
          const roundedLat = Math.round(latitude * 100000) / 100000; // 5 decimal places (~1.1m precision)
          const roundedLon = Math.round(longitude * 100000) / 100000;
          setUserLocation([roundedLat, roundedLon]);
          fetchWeatherForLocation(roundedLat, roundedLon);
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to Bangkok
          setUserLocation([13.7563, 100.5018]);
          fetchWeatherForLocation(13.7563, 100.5018);
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: false, // Reduce precision to prevent constant updates
          timeout: 10000,
          maximumAge: 300000 // Cache location for 5 minutes
        }
      );
    } else {
      // Fallback to Bangkok
      setUserLocation([13.7563, 100.5018]);
      fetchWeatherForLocation(13.7563, 100.5018);
    }
  };

  const fetchWeatherForLocation = async (lat: number, lon: number, forceRefresh = false) => {
    try {
      // Throttle weather requests to prevent spam (minimum 30 seconds between calls unless forced)
      const now = Date.now();
      const timeSinceLastFetch = now - lastWeatherFetch.current;
      
      if (!forceRefresh && timeSinceLastFetch < 30000) { // 30 seconds
        console.log('Weather fetch throttled - too soon since last request');
        return;
      }
      
      lastWeatherFetch.current = now;
      const refreshParam = forceRefresh ? '&refresh=true' : '';
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}${refreshParam}`);
      if (response.ok) {
        const data = await response.json();
        setWeatherData([data]);
        if (forceRefresh) {
          console.log('Environment data refreshed from Air4Thai');
        }
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const syncHotspots = async () => {
    setIsSyncingHotspots(true);
    setLastSyncResult('');
    
    try {
      const response = await fetch('/api/hotspots/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area: 'THAILAND', // Thailand region for more focused data
          days: 1,
          source: 'MODIS_NRT'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastSyncResult(`✅ Synced ${result.inserted} new hotspots, updated ${result.updated}`);
        // Trigger refresh of the map component's hotspot data
        window.dispatchEvent(new CustomEvent('refreshHotspots'));
      } else {
        const error = await response.json();
        setLastSyncResult(`❌ Sync failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error syncing hotspots:', error);
      setLastSyncResult('❌ Network error during sync. Check internet connection.');
    } finally {
      setIsSyncingHotspots(false);
      // Clear message after 5 seconds
      setTimeout(() => setLastSyncResult(''), 5000);
    }
  };

  // Check if user is admin
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const currentWeather = weatherData[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Environmental Map</h1>
            <p className="text-gray-600">View real-time environmental conditions and health data</p>
            {lastSyncResult && (
              <p className="text-sm mt-1 font-medium text-gray-700">{lastSyncResult}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={syncHotspots}
                disabled={isSyncingHotspots}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingHotspots ? 'animate-spin' : ''}`} />
                <Flame className="h-4 w-4" />
                <span>{isSyncingHotspots ? 'Syncing...' : 'Sync Hotspots'}</span>
              </button>
            )}
            <button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <MapPin className="h-4 w-4" />
              <span>{isLoadingLocation ? 'Locating...' : 'My Location'}</span>
            </button>
          </div>
        </div>

        {/* Environment Data Header with Refresh */}
        {currentWeather && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Current Environmental Data</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Source: {currentWeather.source} • Updated: {new Date(currentWeather.recordedAt).toLocaleTimeString()}
              </span>
              <button
                onClick={() => userLocation && fetchWeatherForLocation(userLocation[0], userLocation[1], true)}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        )}

        {/* Current Weather Info */}
        {currentWeather && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <Thermometer className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">Temperature</p>
                  <p className="text-lg font-semibold">
                    {currentWeather.temperature ? `${currentWeather.temperature}°C` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Humidity</p>
                  <p className="text-lg font-semibold">
                    {currentWeather.humidity ? `${currentWeather.humidity}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <Wind className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Wind Speed</p>
                  <p className="text-lg font-semibold">
                    {currentWeather.windSpeed ? `${currentWeather.windSpeed} km/h` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <Cloud className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">PM2.5</p>
                  <p className="text-lg font-semibold">
                    {currentWeather.pm25 ? `${currentWeather.pm25} µg/m³` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">AQI</p>
                  <p className="text-lg font-semibold">
                    {currentWeather.aqi ? (
                      <span className={`${
                        currentWeather.aqi <= 50 ? 'text-green-600' :
                        currentWeather.aqi <= 100 ? 'text-yellow-600' :
                        currentWeather.aqi <= 150 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {currentWeather.aqi}
                      </span>
                    ) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Layer Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              Map Layers
            </h3>
            
            <div className="space-y-3">
              {Object.entries(activeLayers).map(([key, isActive]) => {
                const labels = {
                  weather: 'Weather Stations',
                  pm25: 'PM2.5 Data',
                  covid19: 'COVID-19 Cases',
                  flu: 'Flu Reports',
                  hotspots: 'Fire Hotspots',
                  allEnvironmentalData: 'All Environmental Data'
                };
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {labels[key as keyof typeof labels]}
                    </label>
                    <button
                      onClick={() => toggleLayer(key as keyof typeof activeLayers)}
                      className={`p-1 rounded ${
                        isActive ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legend</h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Air Quality (PM2.5)</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Good (0-12 µg/m³)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Moderate (13-35 µg/m³)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Unhealthy (36-55 µg/m³)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Very Unhealthy (56+ µg/m³)</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Fire Hotspots</h4>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    {hotspotCount} active
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-900 rounded-full"></div>
                    <span>High Intensity (90%+ confidence)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <span>Medium-High (75%+ confidence)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Medium (60%+ confidence)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-300 rounded-full"></div>
                    <span>Lower confidence</span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500">
                    🛰️ NASA FIRMS satellite data
                  </p>
                  {isAdmin && (
                    <div className="space-y-1">
                      <button
                        onClick={syncHotspots}
                        disabled={isSyncingHotspots}
                        className="w-full bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                      >
                        {isSyncingHotspots ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Flame className="h-3 w-3 mr-1" />
                            Sync Hotspots
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('refreshHotspots'))}
                        className="w-full bg-orange-600 text-white text-xs px-2 py-1 rounded hover:bg-orange-700 flex items-center justify-center"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh Map
                      </button>
                      {lastSyncResult && (
                        <p className="text-xs text-gray-600">{lastSyncResult}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-xs">
                🐛 Debug: Hotspots layer {activeLayers.hotspots ? 'ENABLED' : 'DISABLED'} | 
                Count: {hotspotCount} | 
                User: {session?.user?.name || 'Anonymous'}
              </div>
            )}
            <div className="h-[600px]">
              <MapComponent
                activeLayers={activeLayers}
                userLocation={userLocation}
                weatherData={weatherData}
                onHotspotsLoaded={setHotspotCount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
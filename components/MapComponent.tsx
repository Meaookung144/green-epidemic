'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface WeatherDataProps {
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
  dataPointCount?: number;
  isConsolidated?: boolean;
}

interface HotspotData {
  id: string;
  latitude: number;
  longitude: number;
  brightness?: number;
  confidence?: number;
  acquisitionDate: string;
  satellite: string;
  frp?: number; // Fire Radiative Power
  isActive: boolean;
}

interface MapComponentProps {
  activeLayers: {
    weather: boolean;
    pm25: boolean;
    covid19: boolean;
    flu: boolean;
    hotspots?: boolean;
    allEnvironmentalData?: boolean;
  };
  userLocation?: [number, number];
  weatherData?: WeatherDataProps[];
  onHotspotsLoaded?: (count: number) => void;
}

// Component to handle map centering when user location changes
function MapLocationUpdater({ userLocation }: { userLocation?: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 13, {
        duration: 2 // 2 second animation
      });
    }
  }, [userLocation, map]);
  
  return null;
}

interface WeatherData {
  id: string;
  latitude: number;
  longitude: number;
  temperature?: number;
  humidity?: number;
  pm25?: number;
  pm10?: number;
  aqi?: number;
  windSpeed?: number;
  windDirection?: number;
  source: string;
  airQualitySource?: string;
  stationName?: string;
  recordedAt: string;
  createdAt: string;
  dataPointCount?: number;
  isConsolidated?: boolean;
}

interface ReportData {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  title: string;
  severity: number;
  reportDate: string;
}

const MapComponent = ({ activeLayers, userLocation, weatherData: propWeatherData, onHotspotsLoaded }: MapComponentProps) => {
  const [localWeatherData, setLocalWeatherData] = useState<WeatherData[]>([]);
  const [allEnvironmentalData, setAllEnvironmentalData] = useState<WeatherDataProps[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([15.5, 101.0]); // Default central Thailand to better show hotspots
  const isMountedRef = useRef(true);

  // Use passed weather data or local state
  const weatherData = propWeatherData || localWeatherData;

  useEffect(() => {
    // Set map center based on user location or default
    if (userLocation) {
      setMapCenter(userLocation);
    }

    // Only fetch weather data if not provided via props
    if (!propWeatherData && userLocation) {
      fetchWeatherForLocation(userLocation[0], userLocation[1]);
    } else if (!propWeatherData) {
      // Fallback to Bangkok only if no props provided
      fetchWeatherForLocation(13.7563, 100.5018);
    }

    // Fetch reports
    fetchReports();

    // Fetch environmental data if layer is active
    if (activeLayers.allEnvironmentalData && allEnvironmentalData.length === 0) {
      fetchAllEnvironmentalData();
    }

    // Fetch hotspots if layer is active
    if (activeLayers.hotspots) {
      fetchHotspots();
    }
    
    // Set up auto-refresh every 5 minutes for reports only
    const interval = setInterval(() => {
      fetchReports();
      // Only auto-refresh weather if not using prop data
      if (!propWeatherData) {
        const currentLocation = userLocation || [13.7563, 100.5018];
        fetchWeatherForLocation(currentLocation[0], currentLocation[1]);
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      isMountedRef.current = false;
    };
  }, [userLocation, propWeatherData, activeLayers.allEnvironmentalData, activeLayers.hotspots]);

  // Effect to handle environmental data layer toggle
  useEffect(() => {
    if (activeLayers.allEnvironmentalData && allEnvironmentalData.length === 0) {
      fetchAllEnvironmentalData();
    }
  }, [activeLayers.allEnvironmentalData]);

  // Effect to handle hotspots layer toggle
  useEffect(() => {
    if (activeLayers.hotspots) {
      fetchHotspots();
    }
  }, [activeLayers.hotspots]);

  // Listen for hotspot refresh events
  useEffect(() => {
    const handleRefreshHotspots = () => {
      if (activeLayers.hotspots) {
        fetchHotspots();
      }
    };

    window.addEventListener('refreshHotspots', handleRefreshHotspots);
    return () => window.removeEventListener('refreshHotspots', handleRefreshHotspots);
  }, [activeLayers.hotspots]);

  const fetchWeatherForLocation = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setLocalWeatherData([data]); // For now, just show one location
        }
      } else {
        console.error('Weather API returned error status:', response.status);
        if (isMountedRef.current) {
          setLocalWeatherData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      if (isMountedRef.current) {
        setLocalWeatherData([]);
      }
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports?status=APPROVED');
      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setReports(data || []);
        }
      } else {
        console.error('Reports API returned error status:', response.status);
        if (isMountedRef.current) {
          setReports([]);
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Set empty array to prevent the component from breaking
      if (isMountedRef.current) {
        setReports([]);
      }
    }
  };

  const fetchAllEnvironmentalData = async () => {
    try {
      const response = await fetch('/api/data/environmental?limit=500&consolidate=true');
      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setAllEnvironmentalData(data.data || []);
          console.log(`Loaded ${data.data?.length || 0} consolidated environmental data points`);
        }
      } else {
        console.error('Environmental data API returned error status:', response.status);
        if (isMountedRef.current) {
          setAllEnvironmentalData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching environmental data:', error);
      if (isMountedRef.current) {
        setAllEnvironmentalData([]);
      }
    }
  };

  const fetchHotspots = async () => {
    try {
      console.log('🔥 Fetching hotspots from API...');
      const response = await fetch('/api/hotspots?days=7&limit=500&minConfidence=50');
      console.log('🔥 Hotspots API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔥 Hotspots API response data:', data);
        
        if (isMountedRef.current) {
          const hotspotData = data.hotspots || [];
          setHotspots(hotspotData);
          console.log(`🔥 Loaded ${hotspotData.length} hotspot data points for map display`);
          
          // Log some sample hotspot data for debugging
          if (hotspotData.length > 0) {
            console.log('🔥 Sample hotspot:', hotspotData[0]);
          }
          
          // Notify parent component about hotspot count
          if (onHotspotsLoaded) {
            onHotspotsLoaded(hotspotData.length);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('🔥 Hotspots API returned error:', response.status, errorData);
        if (isMountedRef.current) {
          setHotspots([]);
          if (onHotspotsLoaded) {
            onHotspotsLoaded(0);
          }
        }
      }
    } catch (error) {
      console.error('🔥 Error fetching hotspots:', error);
      if (isMountedRef.current) {
        setHotspots([]);
        if (onHotspotsLoaded) {
          onHotspotsLoaded(0);
        }
      }
    }
  };

  const getAQIColor = (aqi: number | undefined) => {
    if (!aqi) return '#808080';
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  };

  const getPM25Color = (pm25: number | undefined) => {
    if (!pm25) return '#808080';
    if (pm25 <= 12) return '#00e400';
    if (pm25 <= 35.4) return '#ffff00';
    if (pm25 <= 55.4) return '#ff7e00';
    if (pm25 <= 150.4) return '#ff0000';
    if (pm25 <= 250.4) return '#8f3f97';
    return '#7e0023';
  };

  const getHotspotColor = (confidence: number | undefined, frp: number | undefined) => {
    // Color based on confidence and fire radiative power
    if (!confidence && !frp) return '#ff6b35'; // Default orange
    
    if (frp) {
      // Color based on Fire Radiative Power (MW)
      if (frp >= 100) return '#8B0000'; // Dark red - Very high intensity
      if (frp >= 50) return '#DC143C'; // Crimson - High intensity  
      if (frp >= 20) return '#FF4500'; // Orange red - Medium intensity
      if (frp >= 5) return '#FF6347'; // Tomato - Low-medium intensity
      return '#FFA500'; // Orange - Low intensity
    }
    
    if (confidence) {
      // Color based on confidence level
      if (confidence >= 90) return '#8B0000'; // Dark red - Very high confidence
      if (confidence >= 75) return '#DC143C'; // Crimson - High confidence
      if (confidence >= 60) return '#FF4500'; // Orange red - Medium confidence
      return '#FFA500'; // Orange - Lower confidence
    }
    
    return '#ff6b35';
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Component to handle automatic location updates */}
      <MapLocationUpdater userLocation={userLocation} />
      
      {/* User location marker */}
      {userLocation && (
        <CircleMarker
          center={userLocation}
          radius={8}
          fillColor="#3b82f6"
          fillOpacity={0.8}
          stroke={true}
          color="#1d4ed8"
          weight={2}
        >
          <Popup>
            <div className="p-2">
              <h4 className="font-bold">Your Location</h4>
              <p className="text-sm text-gray-600">Current position</p>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Weather Layer */}
      {activeLayers.weather && weatherData.map((data) => (
        <CircleMarker
          key={`weather-${data.id}`}
          center={[data.latitude, data.longitude]}
          radius={15}
          fillColor="#4A90E2"
          fillOpacity={0.6}
          stroke={false}
        >
          <Popup>
            <div className="p-2">
              <h4 className="font-bold">Weather Data</h4>
              <p>Temperature: {data.temperature}°C</p>
              <p>Humidity: {data.humidity}%</p>
              <p className="text-xs mt-2">Updated: {new Date(data.recordedAt).toLocaleString()}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* PM2.5 Layer - Temporarily disabled for build - TODO: Fix TypeScript issue */}

      {/* COVID-19 Reports */}
      {activeLayers.covid19 && (
        <>
          {reports
            .filter(r => r.type === 'COVID19')
            .map((report) => (
              <CircleMarker
                key={`covid-${report.id}`}
                center={[report.latitude, report.longitude]}
                radius={10 + report.severity * 2}
                fillColor="#ff0000"
                fillOpacity={0.6}
                color="#cc0000"
                weight={2}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-bold text-red-600">COVID-19 Report</h4>
                    <p>{report.title}</p>
                    <p>Severity: {report.severity}/5</p>
                    <p className="text-xs mt-2">Reported: {new Date(report.reportDate).toLocaleDateString()}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </>
      )}

      {/* Flu Reports */}
      {activeLayers.flu && (
        <>
          {reports
            .filter(r => r.type === 'FLU')
            .map((report) => (
              <CircleMarker
                key={`flu-${report.id}`}
                center={[report.latitude, report.longitude]}
                radius={10 + report.severity * 2}
                fillColor="#ffa500"
                fillOpacity={0.6}
                color="#ff8c00"
                weight={2}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-bold text-orange-600">Flu Report</h4>
                    <p>{report.title}</p>
                    <p>Severity: {report.severity}/5</p>
                    <p className="text-xs mt-2">Reported: {new Date(report.reportDate).toLocaleDateString()}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </>
      )}

      {/* All Environmental Data Points */}
      {activeLayers.allEnvironmentalData && allEnvironmentalData.map((data) => {
        // Determine marker type and color based on data available
        const hasWeather = data.temperature !== null || data.humidity !== null || data.windSpeed !== null;
        const hasAirQuality = data.pm25 !== null || data.pm10 !== null || data.aqi !== null;
        
        let markerColor = '#808080'; // Default gray
        let markerSize = 8;
        let markerType = 'Unknown';
        
        if (hasAirQuality && hasWeather) {
          // Both data types - use PM2.5 color if available, otherwise AQI
          markerColor = data.pm25 ? getPM25Color(data.pm25 ?? undefined) : getAQIColor(data.aqi ?? 0);
          markerSize = 12;
          markerType = 'Weather + Air Quality';
        } else if (hasAirQuality) {
          // Air quality only
          markerColor = data.pm25 ? getPM25Color(data.pm25 ?? undefined) : getAQIColor(data.aqi ?? 0);
          markerSize = 10;
          markerType = 'Air Quality';
        } else if (hasWeather) {
          // Weather only
          markerColor = '#4A90E2';
          markerSize = 8;
          markerType = 'Weather';
        }

        return (
          <CircleMarker
            key={`env-${data.id}`}
            center={[data.latitude, data.longitude]}
            radius={markerSize}
            fillColor={markerColor}
            fillOpacity={0.7}
            color={markerColor}
            weight={2}
            opacity={0.9}
          >
            <Popup>
              <div className="p-2 min-w-[200px] max-w-[280px]">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm">{markerType}</h4>
                  <span className="text-xs bg-gray-800 text-white px-1 py-0.5 rounded">{data.source}</span>
                </div>
                
                {data.stationName && (
                  <p className="text-xs font-medium text-gray-800 mb-1 truncate">{data.stationName}</p>
                )}

                {/* Consolidation Info */}
                {data.isConsolidated && data.dataPointCount && data.dataPointCount > 1 && (
                  <div className="bg-amber-100 border border-amber-300 p-1 rounded mb-1">
                    <p className="text-xs font-medium text-amber-800">
                      📊 {data.dataPointCount} records here
                    </p>
                  </div>
                )}
                
                <div className="space-y-1">
                  {/* Compact Weather Data */}
                  {hasWeather && (
                    <div className="bg-blue-100 p-1 rounded">
                      <div className="flex flex-wrap gap-1 text-xs">
                        {data.temperature && (
                          <span className="bg-blue-200 text-blue-900 px-1 rounded font-medium">
                            {data.temperature}°C
                          </span>
                        )}
                        {data.humidity && (
                          <span className="bg-blue-200 text-blue-900 px-1 rounded">
                            {data.humidity}%💧
                          </span>
                        )}
                        {data.windSpeed && (
                          <span className="bg-blue-200 text-blue-900 px-1 rounded">
                            {data.windSpeed}m/s💨
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Compact Air Quality Data */}
                  {hasAirQuality && (
                    <div className="bg-red-100 p-1 rounded">
                      <div className="flex flex-wrap gap-1 text-xs">
                        {data.pm25 && (
                          <span 
                            className="px-1 rounded font-bold text-white"
                            style={{ backgroundColor: getPM25Color(data.pm25 ?? undefined) }}
                          >
                            PM2.5: {data.pm25}
                          </span>
                        )}
                        {data.pm10 && (
                          <span className="bg-red-200 text-red-900 px-1 rounded">
                            PM10: {data.pm10}
                          </span>
                        )}
                        {data.aqi && (
                          <span 
                            className="px-1 rounded font-bold text-white"
                            style={{ backgroundColor: getAQIColor(data.aqi) }}
                          >
                            AQI: {data.aqi}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-1 pt-1 border-t border-gray-300">
                  <p className="text-xs text-gray-700 font-medium">
                    🕒 {new Date(data.recordedAt).toLocaleString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {data.isConsolidated && (
                    <p className="text-xs text-gray-600">
                      Latest of {data.dataPointCount} records
                    </p>
                  )}
                </div>
              </div>
            </Popup>
            
            {/* Tooltip for quick info */}
            <Tooltip direction="top" permanent={false}>
              <div className="text-center">
                {data.pm25 && <div>PM2.5: {data.pm25}</div>}
                {data.temperature && <div>{data.temperature}°C</div>}
                {data.stationName && <div className="text-xs">{data.stationName}</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Hotspot/Fire Data */}
      {activeLayers.hotspots && hotspots.length > 0 && console.log(`🔥 Rendering ${hotspots.length} hotspots on map`)}
      {activeLayers.hotspots && hotspots.map((hotspot) => {
        const color = getHotspotColor(hotspot.confidence, hotspot.frp);
        const radius = hotspot.frp ? Math.max(10, Math.min(30, hotspot.frp / 3)) : 12; // Made even larger for visibility
        
        return (
          <CircleMarker
            key={`hotspot-${hotspot.id}`}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={radius}
            fillColor={color}
            fillOpacity={0.9}
            color="#000000"
            weight={1}
            opacity={0.8}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-red-700 text-sm flex items-center">
                    🔥 Fire Hotspot
                  </h4>
                  <span className="text-xs bg-red-800 text-white px-2 py-0.5 rounded">
                    {hotspot.satellite}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {/* Fire Properties */}
                  <div className="bg-red-50 p-2 rounded border border-red-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {hotspot.confidence && (
                        <div>
                          <span className="font-medium text-red-900">Confidence:</span>
                          <span className="ml-1 text-red-700">{hotspot.confidence}%</span>
                        </div>
                      )}
                      {hotspot.frp && (
                        <div>
                          <span className="font-medium text-red-900">Power:</span>
                          <span className="ml-1 text-red-700">{hotspot.frp.toFixed(1)} MW</span>
                        </div>
                      )}
                      {hotspot.brightness && (
                        <div>
                          <span className="font-medium text-red-900">Brightness:</span>
                          <span className="ml-1 text-red-700">{hotspot.brightness.toFixed(1)}K</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Satellite Info */}
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-medium text-gray-700">Satellite:</span>
                        <span className="ml-1">{hotspot.satellite}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Detection:</span>
                        <span className="ml-1">
                          {new Date(hotspot.acquisitionDate).toLocaleDateString()} 
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="text-xs text-gray-600">
                    📍 {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                  </div>
                  
                  {/* Warning */}
                  <div className="bg-yellow-100 border border-yellow-300 p-2 rounded">
                    <p className="text-xs text-yellow-800 font-medium">
                      ⚠️ Fire detected by satellite imagery
                    </p>
                  </div>
                </div>
              </div>
            </Popup>
            
            <Tooltip direction="top" permanent={false}>
              <div className="text-center">
                <div className="text-red-700 font-bold">🔥 Fire</div>
                {hotspot.confidence && <div>{hotspot.confidence}% confidence</div>}
                {hotspot.frp && <div>{hotspot.frp.toFixed(1)} MW</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
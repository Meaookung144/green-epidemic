'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
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
  stationName: string | null;
  recordedAt: string;
  createdAt: string;
  dataPointCount?: number;
  isConsolidated?: boolean;
}

interface MapComponentProps {
  activeLayers: {
    weather: boolean;
    pm25: boolean;
    covid19: boolean;
    flu: boolean;
    allEnvironmentalData?: boolean;
  };
  userLocation?: [number, number];
  weatherData?: WeatherDataProps[];
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

const MapComponent = ({ activeLayers, userLocation, weatherData: propWeatherData }: MapComponentProps) => {
  const [localWeatherData, setLocalWeatherData] = useState<WeatherData[]>([]);
  const [allEnvironmentalData, setAllEnvironmentalData] = useState<WeatherDataProps[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]); // Default Bangkok

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
    
    // Set up auto-refresh every 5 minutes for reports only
    const interval = setInterval(() => {
      fetchReports();
      // Only auto-refresh weather if not using prop data
      if (!propWeatherData) {
        const currentLocation = userLocation || [13.7563, 100.5018];
        fetchWeatherForLocation(currentLocation[0], currentLocation[1]);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userLocation, propWeatherData, activeLayers.allEnvironmentalData]);

  // Effect to handle environmental data layer toggle
  useEffect(() => {
    if (activeLayers.allEnvironmentalData && allEnvironmentalData.length === 0) {
      fetchAllEnvironmentalData();
    }
  }, [activeLayers.allEnvironmentalData]);

  const fetchWeatherForLocation = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        const data = await response.json();
        setLocalWeatherData([data]); // For now, just show one location
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports?status=APPROVED');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchAllEnvironmentalData = async () => {
    try {
      const response = await fetch('/api/data/environmental?limit=500&consolidate=true');
      if (response.ok) {
        const data = await response.json();
        setAllEnvironmentalData(data.data);
        console.log(`Loaded ${data.data.length} consolidated environmental data points`);
      }
    } catch (error) {
      console.error('Error fetching environmental data:', error);
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

      {/* PM2.5 Layer */}
      {activeLayers.pm25 && weatherData.map((data) => data.pm25 && (
        <CircleMarker
          key={`pm25-${data.id}`}
          center={[data.latitude, data.longitude]}
          radius={20}
          fillColor={getPM25Color(data.pm25)}
          fillOpacity={0.5}
          color={getPM25Color(data.pm25)}
          weight={2}
        >
          <Tooltip permanent>
            <span className="font-bold">PM2.5: {data.pm25}</span>
          </Tooltip>
          <Popup>
            <div className="p-2">
              <h4 className="font-bold">Air Quality</h4>
              <p>PM2.5: {data.pm25} µg/m³</p>
              <p>AQI: {data.aqi}</p>
              <p className="text-xs mt-2">Updated: {new Date(data.recordedAt).toLocaleString()}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* COVID-19 Reports */}
      {activeLayers.covid19 && reports
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

      {/* Flu Reports */}
      {activeLayers.flu && reports
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
          markerColor = data.pm25 ? getPM25Color(data.pm25) : getAQIColor(data.aqi);
          markerSize = 12;
          markerType = 'Weather + Air Quality';
        } else if (hasAirQuality) {
          // Air quality only
          markerColor = data.pm25 ? getPM25Color(data.pm25) : getAQIColor(data.aqi);
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
                            style={{ backgroundColor: getPM25Color(data.pm25) }}
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
    </MapContainer>
  );
};

export default MapComponent;
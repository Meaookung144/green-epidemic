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

interface MapComponentProps {
  activeLayers: {
    weather: boolean;
    pm25: boolean;
    covid19: boolean;
    flu: boolean;
  };
  userLocation?: [number, number];
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
  aqi?: number;
  recordedAt: string;
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

const MapComponent = ({ activeLayers, userLocation }: MapComponentProps) => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]); // Default Bangkok

  useEffect(() => {
    // Set map center based on user location or default
    if (userLocation) {
      setMapCenter(userLocation);
      fetchWeatherForLocation(userLocation[0], userLocation[1]);
    } else {
      // Fallback to Bangkok
      fetchWeatherForLocation(13.7563, 100.5018);
    }

    // Fetch reports
    fetchReports();
    
    // Set up auto-refresh every 5 minutes for display
    const interval = setInterval(() => {
      fetchReports();
      const currentLocation = userLocation || [13.7563, 100.5018];
      fetchWeatherForLocation(currentLocation[0], currentLocation[1]);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userLocation]);

  const fetchWeatherForLocation = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        const data = await response.json();
        setWeatherData([data]); // For now, just show one location
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
    </MapContainer>
  );
};

export default MapComponent;
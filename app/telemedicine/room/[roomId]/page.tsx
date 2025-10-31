'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function MeetingRoomPage({ params }: RoomPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [roomReady, setRoomReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  const { roomId } = use(params);
  const token = searchParams.get('token');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    if (!token) {
      setError('Access token required');
      setLoading(false);
      return;
    }

    validateRoomAccess();
    getUserLocation();
  }, [status, session, router, token, roomId]);

  useEffect(() => {
    if (userLocation) {
      fetchWeatherData();
    }
  }, [userLocation]);

  const validateRoomAccess = async () => {
    try {
      const response = await fetch(`/api/telemedicine/rooms/${roomId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoomData(data);
        await getIframeUrl();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to validate room access');
      }
    } catch (error) {
      console.error('Room validation error:', error);
      setError('Failed to validate room access');
    } finally {
      setLoading(false);
    }
  };

  const getIframeUrl = async () => {
    try {
      const response = await fetch(`/api/telemedicine/rooms/${roomId}/iframe?token=${token}`);
      
      if (response.ok) {
        const data = await response.json();
        setIframeUrl(data.iframeUrl);
        setRoomReady(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get iframe URL');
      }
    } catch (error) {
      console.error('Error getting iframe URL:', error);
      setError('Failed to load meeting room');
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location (Bangkok) if geolocation fails
          setUserLocation({ lat: 13.7563, lon: 100.5018 });
        }
      );
    } else {
      // Use default location if geolocation is not supported
      setUserLocation({ lat: 13.7563, lon: 100.5018 });
    }
  };

  const fetchWeatherData = async () => {
    if (!userLocation) return;
    
    try {
      const response = await fetch(`/api/weather?lat=${userLocation.lat}&lon=${userLocation.lon}`);
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };

  const getPM25Status = (pm25: number) => {
    if (pm25 <= 12) return { status: 'Good', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (pm25 <= 35) return { status: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (pm25 <= 55) return { status: 'Unhealthy for Sensitive', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    if (pm25 <= 150) return { status: 'Unhealthy', color: 'text-red-600', bgColor: 'bg-red-100' };
    return { status: 'Hazardous', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  };

  const getHealthWarning = (pm25: number, temperature: number) => {
    const warnings = [];
    
    if (pm25 > 35) {
      warnings.push('🔴 High air pollution - avoid outdoor activities');
    }
    if (temperature > 35) {
      warnings.push('🔥 High temperature - stay hydrated');
    }
    if (temperature < 18) {
      warnings.push('❄️ Cool weather - dress warmly');
    }
    if (pm25 > 55) {
      warnings.push('⚠️ Sensitive individuals should wear masks');
    }
    
    return warnings.length > 0 ? warnings : ['✅ Air quality is good for outdoor activities'];
  };

  const endCall = async () => {
    try {
      const response = await fetch(`/api/telemedicine/rooms/${roomId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Call ended');
        router.push('/telemedicine');
      } else {
        toast.error('Failed to end call');
      }
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to meeting room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/telemedicine')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Return to Telemedicine
          </button>
        </div>
      </div>
    );
  }

  if (!roomReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">🏥</div>
          <p className="text-gray-600">Setting up meeting room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                🏥 Telemedicine Consultation
              </h1>
              {roomData?.consultation && (
                <p className="text-sm text-gray-600">
                  Consultation ID: {roomData.consultation.id}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={endCall}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                📞 End Call
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Call Container */}
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="w-full bg-black rounded-lg relative" style={{ minHeight: '600px' }}>
            {iframeUrl ? (
              <iframe
                src={iframeUrl}
                className="w-full h-full rounded-lg"
                style={{ minHeight: '600px' }}
                allow="camera; microphone; fullscreen; display-capture"
                allowFullScreen
                title="Video Call Interface"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-4xl mb-4">📹</div>
                  <p>Loading video call...</p>
                </div>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="mt-4 text-center">
            <div className="bg-white rounded-lg p-4 shadow-lg inline-block">
              <div className="flex gap-4 items-center">
                <button className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition">
                  🎤
                </button>
                <button className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition">
                  📹
                </button>
                <button className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition">
                  💬
                </button>
                <button className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition">
                  📱
                </button>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="mt-6 bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">💬 Consultation Notes</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2 mb-4" style={{ height: '200px', overflowY: 'auto' }}>
                <div className="text-sm text-gray-600">
                  Consultation started. You can add notes here during the call.
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a note..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
                />
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Widget - Fixed Bottom Left */}
      {weatherData && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-3 max-w-xs border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌡️</span>
              <div className="text-sm">
                <div className="font-semibold text-gray-900">
                  {Math.round(weatherData.temperature || 0)}°C
                </div>
                <div className="text-xs text-gray-600">
                  {weatherData.source === 'air4thai' ? weatherData.stationName : 'Nearest Station'}
                </div>
              </div>
            </div>
            
            {weatherData.pm25 && (
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">PM2.5:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPM25Status(weatherData.pm25).color} ${getPM25Status(weatherData.pm25).bgColor}`}>
                    {Math.round(weatherData.pm25)} μg/m³
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {getPM25Status(weatherData.pm25).status}
                </div>
              </div>
            )}

            {weatherData.aqi && (
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">AQI:</span>
                  <span className="font-medium text-sm">{weatherData.aqi}</span>
                </div>
              </div>
            )}

            {/* Health Warnings */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="space-y-1">
                {getHealthWarning(weatherData.pm25 || 0, weatherData.temperature || 0).slice(0, 2).map((warning, index) => (
                  <div key={index} className="text-xs text-gray-700 leading-tight">
                    {warning}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500 text-center">
              Updated: {new Date(weatherData.recordedAt || Date.now()).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
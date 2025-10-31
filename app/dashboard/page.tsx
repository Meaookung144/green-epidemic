'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import IntegrationsSection from '@/components/IntegrationsSection';
import { DatePicker } from '@/components/ui/date-picker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
});

interface SurveillancePoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  radius: number;
  active: boolean;
}

interface AIAnalysis {
  id: string;
  title: string;
  summary: string;
  analysis?: string;
  recommendations?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  weatherDataCount: number;
  reportsCount: number;
  createdAt: string;
}

interface EnvironmentalData {
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
  stationId: string | null;
  recordedAt: string;
  createdAt: string;
}

interface EnvironmentalStats {
  total: number;
  averages: {
    temperature: number | null;
    humidity: number | null;
    pm25: number | null;
    pm10: number | null;
    aqi: number | null;
    windSpeed: number | null;
  };
  ranges: {
    temperature: { min: number | null; max: number | null };
    pm25: { min: number | null; max: number | null };
    aqi: { min: number | null; max: number | null };
  };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [editingPoint, setEditingPoint] = useState<SurveillancePoint | null>(null);
  const [surveillancePoints, setSurveillancePoints] = useState<SurveillancePoint[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData[]>([]);
  const [environmentalStats, setEnvironmentalStats] = useState<EnvironmentalStats | null>(null);
  const [showEnvironmentalData, setShowEnvironmentalData] = useState(false);
  const [environmentalLoading, setEnvironmentalLoading] = useState(false);
  const [dataFilter, setDataFilter] = useState({
    source: '',
    hasWeather: false,
    hasAirQuality: false,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date() // today
  });
  const [userProfile, setUserProfile] = useState({
    homeLatitude: 0,
    homeLongitude: 0,
    homeAddress: '',
    lineOfficialConnected: false,
    googleSyncEnabled: false,
  });
  const [newPoint, setNewPoint] = useState({
    name: '',
    latitude: 0,
    longitude: 0,
    address: '',
    radius: 500,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchUserData();
    }
  }, [status, router]);

  const fetchUserData = async () => {
    try {
      const [profileRes, pointsRes, analysisRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/user/surveillance-points'),
        fetch('/api/ai-analysis')
      ]);

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserProfile({
          homeLatitude: profile.homeLatitude || 0,
          homeLongitude: profile.homeLongitude || 0,
          homeAddress: profile.homeAddress || '',
          lineOfficialConnected: profile.lineOfficialConnected || false,
          googleSyncEnabled: profile.googleSyncEnabled || false,
        });
      }

      if (pointsRes.ok) {
        const points = await pointsRes.json();
        setSurveillancePoints(points);
      }

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        setAiAnalyses(analysisData.analyses || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    if (editingPoint) {
      setEditingPoint({
        ...editingPoint,
        latitude: lat,
        longitude: lng,
        address: address || ''
      });
    } else {
      setNewPoint({
        ...newPoint,
        latitude: lat,
        longitude: lng,
        address: address || ''
      });
    }
  };

  const handleSaveHome = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homeLatitude: userProfile.homeLatitude,
          homeLongitude: userProfile.homeLongitude,
          homeAddress: userProfile.homeAddress,
        }),
      });

      if (response.ok) {
        toast.success(t('toast.home_updated'));
      } else {
        toast.error(t('toast.home_update_failed'));
      }
    } catch (error) {
      console.error('Error updating home location:', error);
      toast.error(t('toast.home_update_error'));
    }
  };

  const handleSavePoint = async () => {
    if (!newPoint.name || !newPoint.latitude || !newPoint.longitude) {
      toast.error(t('toast.fill_required_fields'));
      return;
    }

    try {
      const response = await fetch('/api/user/surveillance-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPoint),
      });

      if (response.ok) {
        await fetchUserData();
        setNewPoint({
          name: '',
          latitude: 0,
          longitude: 0,
          address: '',
          radius: 500,
        });
        toast.success(t('toast.surveillance_added'));
      } else {
        toast.error(t('toast.surveillance_add_failed'));
      }
    } catch (error) {
      console.error('Error adding surveillance point:', error);
      toast.error(t('toast.surveillance_add_error'));
    }
  };

  const handleUpdatePoint = async () => {
    if (!editingPoint) return;

    try {
      const response = await fetch(`/api/user/surveillance-points/${editingPoint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingPoint.name,
          latitude: editingPoint.latitude,
          longitude: editingPoint.longitude,
          address: editingPoint.address,
          radius: editingPoint.radius,
          active: editingPoint.active,
        }),
      });

      if (response.ok) {
        await fetchUserData();
        setEditingPoint(null);
        toast.success(t('toast.surveillance_updated'));
      } else {
        toast.error(t('toast.surveillance_update_failed'));
      }
    } catch (error) {
      console.error('Error updating surveillance point:', error);
      toast.error(t('toast.surveillance_update_error'));
    }
  };

  const handleDeletePoint = async (id: string) => {
    if (!confirm(t('dashboard.confirm_delete'))) return;

    try {
      const response = await fetch(`/api/user/surveillance-points/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUserData();
        toast.success(t('toast.surveillance_deleted'));
      } else {
        toast.error(t('toast.surveillance_delete_failed'));
      }
    } catch (error) {
      console.error('Error deleting surveillance point:', error);
      toast.error(t('toast.surveillance_delete_error'));
    }
  };

  const handleGenerateAnalysis = async () => {
    setGeneratingAnalysis(true);
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data.generated) {
          toast.success(t('toast.ai_analysis_generated'));
          await fetchUserData(); // Refresh the analyses list
        } else if (data.cooldown) {
          toast.success(t('toast.using_recent_analysis'));
          if (data.analysis) {
            setSelectedAnalysis(data.analysis);
          }
        }
      } else {
        toast.error(data.error || t('toast.failed_to_generate_analysis'));
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast.error(t('toast.error_generating_analysis'));
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const handleViewAnalysis = async (analysisId: string) => {
    try {
      const response = await fetch(`/api/ai-analysis/${analysisId}`);
      if (response.ok) {
        const analysis = await response.json();
        setSelectedAnalysis(analysis);
      } else {
        toast.error(t('toast.failed_to_load_analysis'));
      }
    } catch (error) {
      console.error('Error fetching analysis details:', error);
      toast.error(t('toast.error_loading_analysis'));
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchEnvironmentalData = async () => {
    setEnvironmentalLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      });

      if (dataFilter.source) params.append('source', dataFilter.source);
      if (dataFilter.hasWeather) params.append('hasWeather', 'true');
      if (dataFilter.hasAirQuality) params.append('hasAirQuality', 'true');
      if (dataFilter.startDate) params.append('startDate', dataFilter.startDate.toISOString().split('T')[0]);
      if (dataFilter.endDate) params.append('endDate', dataFilter.endDate.toISOString().split('T')[0]);

      const response = await fetch(`/api/data/environmental?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEnvironmentalData(data.data);
        setEnvironmentalStats(data.statistics);
      } else {
        toast.error(t('toast.failed_to_load_environmental_data'));
      }
    } catch (error) {
      console.error('Error fetching environmental data:', error);
      toast.error(t('toast.error_loading_environmental_data'));
    } finally {
      setEnvironmentalLoading(false);
    }
  };

  const getAQIColor = (aqi: number | null) => {
    if (!aqi) return 'text-gray-500';
    if (aqi <= 50) return 'text-green-600';
    if (aqi <= 100) return 'text-yellow-600';
    if (aqi <= 150) return 'text-orange-600';
    if (aqi <= 200) return 'text-red-600';
    return 'text-purple-600';
  };

  const getPM25Color = (pm25: number | null) => {
    if (!pm25) return 'text-gray-500';
    if (pm25 <= 12) return 'text-green-600';
    if (pm25 <= 35) return 'text-yellow-600';
    if (pm25 <= 55) return 'text-orange-600';
    if (pm25 <= 150) return 'text-red-600';
    return 'text-purple-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-lg md:text-xl font-bold">{t('dashboard.title')}</h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="text-xs md:text-sm hidden sm:block">{t('nav.welcome')}, {session?.user?.name}</span>
              <Link
                href="/"
                className="text-xs md:text-sm bg-green-600 hover:bg-green-500 px-2 md:px-3 py-1 rounded transition"
              >
                {t('dashboard.back_to_map')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Home Location */}
          <div className="bg-white shadow rounded-lg p-4 md:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.home_location')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.address')}
                </label>
                <input
                  type="text"
                  value={userProfile.homeAddress}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  placeholder={t('dashboard.no_home_location')}
                  readOnly
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    setEditingPoint(null);
                    setShowLocationPicker(true);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base"
                >
                  📍 {t('dashboard.set_home_location')}
                </button>
                {userProfile.homeLatitude !== 0 && (
                  <button
                    onClick={handleSaveHome}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm md:text-base"
                  >
                    {t('dashboard.save')}
                  </button>
                )}
              </div>
              
              {userProfile.homeLatitude !== 0 && (
                <p className="text-xs text-gray-500">
                  {t('dashboard.coordinates')}: {userProfile.homeLatitude.toFixed(6)}, {userProfile.homeLongitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* Add Surveillance Point */}
          <div className="bg-white shadow rounded-lg p-4 md:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.add_surveillance_point')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.name')}
                </label>
                <input
                  type="text"
                  value={newPoint.name}
                  onChange={(e) => setNewPoint({...newPoint, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t('dashboard.name_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.location')}
                </label>
                <input
                  type="text"
                  value={newPoint.address}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 mb-2"
                  placeholder={t('dashboard.select_location_from_map')}
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => {
                    setEditingPoint(null);
                    setShowLocationPicker(true);
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base"
                >
                  📍 {t('dashboard.pick_from_map')}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dashboard.alert_radius')}
                </label>
                <input
                  type="number"
                  value={newPoint.radius}
                  onChange={(e) => setNewPoint({...newPoint, radius: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="100"
                  max="2000"
                />
              </div>

              <button
                onClick={handleSavePoint}
                disabled={!newPoint.name || !newPoint.latitude}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm md:text-base"
              >
                {t('dashboard.add_surveillance_point')}
              </button>
            </div>
          </div>
        </div>

        {/* Surveillance Points List */}
        <div className="mt-4 md:mt-6 bg-white shadow rounded-lg">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">{t('dashboard.your_surveillance_points')}</h2>
          </div>
          <div className="p-4 md:p-6">
            {surveillancePoints.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm md:text-base">
                {t('dashboard.no_surveillance_points')}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {surveillancePoints.map((point) => (
                  <div key={point.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{point.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        point.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {point.active ? t('dashboard.active') : t('dashboard.inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{point.address}</p>
                    <p className="text-xs text-gray-500 mb-3">
                      {t('dashboard.radius')}: {point.radius}m
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          setEditingPoint(point);
                          setShowLocationPicker(true);
                        }}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-xs md:text-sm hover:bg-blue-700 transition"
                      >
                        {t('dashboard.edit')}
                      </button>
                      <button
                        onClick={() => handleDeletePoint(point.id)}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-xs md:text-sm hover:bg-red-700 transition"
                      >
                        {t('dashboard.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="mt-4 md:mt-6 bg-white shadow rounded-lg">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">🤖 {t('dashboard.ai_environmental_analysis')}</h2>
              <button
                onClick={handleGenerateAnalysis}
                disabled={generatingAnalysis}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {generatingAnalysis ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('dashboard.generating')}
                  </>
                ) : (
                  t('dashboard.generate_new_analysis')
                )}
              </button>
            </div>
          </div>
          <div className="p-4 md:p-6">
            {aiAnalyses.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">🔍</div>
                <p className="text-gray-500 mb-4">{t('dashboard.no_ai_analyses')}</p>
                <p className="text-sm text-gray-400">{t('dashboard.generate_first_analysis')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {aiAnalyses.map((analysis) => (
                  <div key={analysis.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
                       onClick={() => handleViewAnalysis(analysis.id)}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 flex-1">{analysis.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ml-2 ${getSeverityColor(analysis.severity)}`}>
                        {analysis.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{analysis.summary}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>📊 {analysis.weatherDataCount} data points • 📋 {analysis.reportsCount} reports</span>
                      <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">{t('dashboard.confidence')}:</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${analysis.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{Math.round(analysis.confidence * 100)}%</span>
                      </div>
                      <span className="text-xs text-blue-600 hover:text-blue-800">{t('dashboard.view_details')} →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Environmental Data Section */}
        <div className="mt-4 md:mt-6 bg-white shadow rounded-lg">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">🌍 {t('dashboard.environmental_data_points')}</h2>
              <button
                onClick={() => {
                  setShowEnvironmentalData(!showEnvironmentalData);
                  if (!showEnvironmentalData && environmentalData.length === 0) {
                    fetchEnvironmentalData();
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                {showEnvironmentalData ? t('dashboard.hide_data') : t('dashboard.show_all_data')}
              </button>
            </div>
          </div>

          {showEnvironmentalData && (
            <div className="p-4 md:p-6">
              {/* Filters */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">{t('dashboard.filter_data')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('dashboard.source')}</label>
                    <input
                      type="text"
                      value={dataFilter.source}
                      onChange={(e) => setDataFilter({...dataFilter, source: e.target.value})}
                      placeholder="e.g., Air4Thai"
                      className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('dashboard.start_date')}</label>
                    <DatePicker
                      date={dataFilter.startDate}
                      onDateChange={(date) => setDataFilter({...dataFilter, startDate: date || new Date()})}
                      placeholder={t('dashboard.select_start_date')}
                      className="w-full text-sm"
                      allowPastDates={true}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('dashboard.end_date')}</label>
                    <DatePicker
                      date={dataFilter.endDate}
                      onDateChange={(date) => setDataFilter({...dataFilter, endDate: date || new Date()})}
                      placeholder={t('dashboard.select_end_date')}
                      className="w-full text-sm"
                      allowPastDates={true}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchEnvironmentalData}
                      disabled={environmentalLoading}
                      className="w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition text-sm"
                    >
                      {environmentalLoading ? t('dashboard.loading') : t('dashboard.apply_filters')}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={dataFilter.hasWeather}
                      onChange={(e) => setDataFilter({...dataFilter, hasWeather: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-xs text-gray-700">{t('dashboard.has_weather_data')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={dataFilter.hasAirQuality}
                      onChange={(e) => setDataFilter({...dataFilter, hasAirQuality: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-xs text-gray-700">{t('dashboard.has_air_quality_data')}</span>
                  </label>
                </div>
              </div>

              {/* Statistics */}
              {environmentalStats && (
                <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-blue-600 font-medium">{t('dashboard.total_points')}</div>
                    <div className="text-lg font-semibold text-blue-900">{environmentalStats.total}</div>
                  </div>
                  {environmentalStats.averages.temperature && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-xs text-orange-600 font-medium">{t('dashboard.avg_temp')}</div>
                      <div className="text-lg font-semibold text-orange-900">{environmentalStats.averages.temperature}°C</div>
                    </div>
                  )}
                  {environmentalStats.averages.humidity && (
                    <div className="bg-cyan-50 p-3 rounded-lg">
                      <div className="text-xs text-cyan-600 font-medium">{t('dashboard.avg_humidity')}</div>
                      <div className="text-lg font-semibold text-cyan-900">{environmentalStats.averages.humidity}%</div>
                    </div>
                  )}
                  {environmentalStats.averages.pm25 && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-xs text-red-600 font-medium">{t('dashboard.avg_pm25')}</div>
                      <div className="text-lg font-semibold text-red-900">{environmentalStats.averages.pm25} μg/m³</div>
                    </div>
                  )}
                  {environmentalStats.averages.aqi && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-xs text-purple-600 font-medium">{t('dashboard.avg_aqi')}</div>
                      <div className="text-lg font-semibold text-purple-900">{environmentalStats.averages.aqi}</div>
                    </div>
                  )}
                  {environmentalStats.averages.windSpeed && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-green-600 font-medium">{t('dashboard.avg_wind')}</div>
                      <div className="text-lg font-semibold text-green-900">{environmentalStats.averages.windSpeed} m/s</div>
                    </div>
                  )}
                </div>
              )}

              {/* Data Table */}
              {environmentalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : environmentalData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📊</div>
                  <p className="text-gray-500 mb-4">{t('dashboard.no_environmental_data')}</p>
                  <p className="text-sm text-gray-400">{t('dashboard.try_adjusting_filters')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.location')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.weather')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.air_quality')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.source')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.recorded')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {environmentalData.map((data) => (
                        <tr key={data.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm">
                            <div>
                              <div className="font-medium text-gray-900">
                                {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                              </div>
                              {data.stationName && (
                                <div className="text-xs text-gray-500">{data.stationName}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <div className="space-y-1">
                              {data.temperature && (
                                <div className="text-orange-600">🌡️ {data.temperature}°C</div>
                              )}
                              {data.humidity && (
                                <div className="text-cyan-600">💧 {data.humidity}%</div>
                              )}
                              {data.windSpeed && (
                                <div className="text-green-600">💨 {data.windSpeed} m/s</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <div className="space-y-1">
                              {data.pm25 && (
                                <div className={getPM25Color(data.pm25)}>
                                  PM2.5: {data.pm25} μg/m³
                                </div>
                              )}
                              {data.pm10 && (
                                <div className="text-gray-600">PM10: {data.pm10} μg/m³</div>
                              )}
                              {data.aqi && (
                                <div className={getAQIColor(data.aqi)}>
                                  AQI: {data.aqi}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <div>
                              <div className="text-gray-900">{data.source}</div>
                              {data.airQualitySource && data.airQualitySource !== data.source && (
                                <div className="text-xs text-gray-500">Air: {data.airQualitySource}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            <div>
                              <div>{new Date(data.recordedAt).toLocaleDateString()}</div>
                              <div className="text-xs">{new Date(data.recordedAt).toLocaleTimeString()}</div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Integrations Section */}
        <div className="mt-4 md:mt-6">
          <IntegrationsSection 
            user={userProfile} 
            onUpdate={fetchUserData}
          />
        </div>
      </div>

      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => {
          setShowLocationPicker(false);
          setEditingPoint(null);
        }}
        onLocationSelect={(lat, lng, address) => {
          if (editingPoint) {
            setEditingPoint({
              ...editingPoint,
              latitude: lat,
              longitude: lng,
              address: address || ''
            });
          } else {
            // Setting home location
            setUserProfile({
              ...userProfile,
              homeLatitude: lat,
              homeLongitude: lng,
              homeAddress: address || ''
            });
            // Or setting new surveillance point
            setNewPoint({
              ...newPoint,
              latitude: lat,
              longitude: lng,
              address: address || ''
            });
          }
        }}
        initialLocation={
          editingPoint
            ? { lat: editingPoint.latitude, lng: editingPoint.longitude }
            : userProfile.homeLatitude !== 0
            ? { lat: userProfile.homeLatitude, lng: userProfile.homeLongitude }
            : undefined
        }
      />

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.ai_environmental_analysis')}</h2>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{selectedAnalysis.title}</h3>
                  <span className={`px-3 py-1 text-sm rounded-full ${getSeverityColor(selectedAnalysis.severity)}`}>
                    {selectedAnalysis.severity}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <span>📊 {selectedAnalysis.weatherDataCount} data points</span>
                  <span>📋 {selectedAnalysis.reportsCount} reports</span>
                  <span>📅 {new Date(selectedAnalysis.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center">
                    <span className="mr-2">{t('dashboard.confidence')}: {Math.round(selectedAnalysis.confidence * 100)}%</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${selectedAnalysis.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">📋 {t('dashboard.executive_summary')}</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedAnalysis.summary}</p>
                </div>

                {selectedAnalysis.analysis && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">🔍 {t('dashboard.detailed_analysis')}</h4>
                    <div className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                      {selectedAnalysis.analysis}
                    </div>
                  </div>
                )}

                {selectedAnalysis.recommendations && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">💡 {t('dashboard.recommendations')}</h4>
                    <div className="text-gray-700 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 whitespace-pre-wrap">
                      {selectedAnalysis.recommendations}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 text-right">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                {t('dashboard.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
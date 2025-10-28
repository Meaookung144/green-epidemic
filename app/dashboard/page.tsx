'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import LocationPicker from '@/components/LocationPicker';

interface SurveillancePoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  radius: number;
  active: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [editingPoint, setEditingPoint] = useState<SurveillancePoint | null>(null);
  const [surveillancePoints, setSurveillancePoints] = useState<SurveillancePoint[]>([]);
  const [userProfile, setUserProfile] = useState({
    homeLatitude: 0,
    homeLongitude: 0,
    homeAddress: '',
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
      const [profileRes, pointsRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/user/surveillance-points')
      ]);

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserProfile({
          homeLatitude: profile.homeLatitude || 0,
          homeLongitude: profile.homeLongitude || 0,
          homeAddress: profile.homeAddress || '',
        });
      }

      if (pointsRes.ok) {
        const points = await pointsRes.json();
        setSurveillancePoints(points);
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
              <a
                href="/"
                className="text-xs md:text-sm bg-green-600 hover:bg-green-500 px-2 md:px-3 py-1 rounded transition"
              >
                {t('dashboard.back_to_map')}
              </a>
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
    </div>
  );
}
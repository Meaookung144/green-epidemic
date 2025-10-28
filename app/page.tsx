'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useTranslation } from 'react-i18next';
import ReportModal from '@/components/ReportModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-gray-100 animate-pulse" />
});

export default function Home() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [activeLayers, setActiveLayers] = useState({
    weather: true,
    pm25: true,
    covid19: true,
    flu: true,
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  return (
    <div className="relative w-full h-screen">
      <MapComponent 
        activeLayers={activeLayers} 
        userLocation={userLocation ? [userLocation.lat, userLocation.lng] : undefined}
      />
      
      {/* Desktop: Top-right controls */}
      <div className="hidden md:block absolute top-4 right-4 z-[1000] space-y-4">
        <LanguageSwitcher />
        
        <div className="bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
          <h3 className="font-semibold mb-3 text-gray-800">{t('map.layers')}</h3>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.weather}
                onChange={(e) => setActiveLayers({...activeLayers, weather: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.weather')}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.pm25}
                onChange={(e) => setActiveLayers({...activeLayers, pm25: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.pm25')}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.covid19}
                onChange={(e) => setActiveLayers({...activeLayers, covid19: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.covid19')}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.flu}
                onChange={(e) => setActiveLayers({...activeLayers, flu: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.flu')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Mobile: Bottom overlay with collapsible controls */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 z-[1000] bg-white border-t border-gray-200 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{t('map.layers')}</h3>
            <div className="scale-75">
              <LanguageSwitcher />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.weather}
                onChange={(e) => setActiveLayers({...activeLayers, weather: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.weather')}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.pm25}
                onChange={(e) => setActiveLayers({...activeLayers, pm25: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.pm25')}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.covid19}
                onChange={(e) => setActiveLayers({...activeLayers, covid19: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.covid19')}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.flu}
                onChange={(e) => setActiveLayers({...activeLayers, flu: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">{t('map.flu')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Mobile: Top floating action button */}
      <div className="md:hidden absolute top-4 left-4 z-[1000]">
        <button 
          onClick={() => setShowReportModal(true)}
          className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition w-14 h-14 flex items-center justify-center"
          title={t('map.report_illness')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Mobile: User menu in top-right */}
      <div className="md:hidden absolute top-4 right-4 z-[1000]">
        {session?.user ? (
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition w-12 h-12 flex items-center justify-center"
              title={t('nav.my_dashboard')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>
            {(session.user as any).role === 'ADMIN' && (
              <a
                href="/admin"
                className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition w-12 h-12 flex items-center justify-center"
                title={t('nav.admin_panel')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            )}
          </div>
        ) : (
          <a
            href="/auth/signin"
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition w-12 h-12 flex items-center justify-center"
            title={t('nav.sign_in')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </a>
        )}
      </div>

      {/* Desktop: Left side controls */}
      <div className="hidden md:block absolute top-4 left-4 z-[1000]">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setShowReportModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700 transition"
          >
            {t('map.report_illness')}
          </button>
          
          {session?.user && (session.user as any).role === 'ADMIN' && (
            <a
              href="/admin"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition text-center"
            >
              {t('nav.admin_panel')}
            </a>
          )}
          
          {session?.user ? (
            <div className="space-y-2">
              <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                <p className="text-sm text-gray-600">{t('nav.welcome')}</p>
                <p className="text-sm font-semibold">{session.user.name}</p>
              </div>
              <a
                href="/dashboard"
                className="block bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition text-center text-sm"
              >
                {t('nav.my_dashboard')}
              </a>
            </div>
          ) : (
            <a
              href="/auth/signin"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition text-center"
            >
              {t('nav.sign_in')}
            </a>
          )}
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        latitude={userLocation?.lat}
        longitude={userLocation?.lng}
      />
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useSession } from "next-auth/react";
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import LocationPicker from './LocationPicker';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude?: number;
  longitude?: number;
}

export default function ReportModal({ isOpen, onClose, latitude, longitude }: ReportModalProps) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [formData, setFormData] = useState({
    type: 'COVID19',
    title: '',
    description: '',
    symptoms: [] as string[],
    severity: 3,
    latitude: latitude || 0,
    longitude: longitude || 0,
    address: ''
  });

  const symptomOptions = {
    COVID19: [
      t('symptoms.fever'),
      t('symptoms.cough'),
      t('symptoms.shortness_breath'),
      t('symptoms.loss_taste_smell'),
      t('symptoms.fatigue'),
      t('symptoms.body_aches')
    ],
    FLU: [
      t('symptoms.fever'),
      t('symptoms.cough'),
      t('symptoms.sore_throat'),
      t('symptoms.runny_nose'),
      t('symptoms.body_aches'),
      t('symptoms.headache')
    ],
    OTHER: [
      t('symptoms.fever'),
      t('symptoms.nausea'),
      t('symptoms.vomiting'),
      t('symptoms.diarrhea'),
      t('symptoms.rash'),
      t('symptoms.other')
    ]
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      window.location.href = '/auth/signin';
      return;
    }

    setLoading(true);
    
    try {
      // Get current location if not provided
      if (!formData.latitude || !formData.longitude) {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          formData.latitude = position.coords.latitude;
          formData.longitude = position.coords.longitude;
        }
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: (session.user as any).id,
        }),
      });

      if (response.ok) {
        toast.success(t('toast.report_submitted'));
        onClose();
        setFormData({
          type: 'COVID19',
          title: '',
          description: '',
          symptoms: [],
          severity: 3,
          latitude: 0,
          longitude: 0,
          address: ''
        });
      } else {
        toast.error(t('toast.report_failed'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(t('toast.report_error'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address || ''
    }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          
          // Reverse geocode to get address
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
            .then(res => res.json())
            .then(data => {
              if (data.display_name) {
                setFormData(prev => ({
                  ...prev,
                  address: data.display_name
                }));
              }
            })
            .catch(console.error);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error(t('toast.location_error'));
        }
      );
    } else {
      toast.error(t('toast.geolocation_not_supported'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto md:m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{t('report.title')}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {!session ? (
            <div className="text-center py-8">
              <p className="mb-4">{t('report.sign_in_required')}</p>
              <button
                onClick={() => window.location.href = '/auth/signin'}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                {t('nav.sign_in')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('report.type')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value, symptoms: []})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="COVID19">{t('report.covid19')}</option>
                  <option value="FLU">{t('report.flu')}</option>
                  <option value="OTHER">{t('report.other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('report.title_field')}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t('report.title_placeholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('report.symptoms')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {symptomOptions[formData.type as keyof typeof symptomOptions].map(symptom => (
                    <label key={symptom} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.symptoms.includes(symptom)}
                        onChange={() => toggleSymptom(symptom)}
                        className="mr-2 flex-shrink-0"
                      />
                      <span className="text-sm">{symptom}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.severity}
                  onChange={(e) => setFormData({...formData, severity: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Mild</span>
                  <span className="font-bold text-lg">{formData.severity}</span>
                  <span>Severe</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Any additional information..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Address will be filled automatically"
                    readOnly
                  />
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      {t('report.pick_from_map')}
                    </button>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      {t('report.current_location')}
                    </button>
                  </div>
                  
                  {formData.latitude !== 0 && formData.longitude !== 0 && (
                    <p className="text-xs text-gray-500">
                      Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={
          formData.latitude !== 0 && formData.longitude !== 0
            ? { lat: formData.latitude, lng: formData.longitude }
            : undefined
        }
      />
    </div>
  );
}
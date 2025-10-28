'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLocation?: { lat: number; lng: number };
}

function LocationMarker({ position, setPosition }: { 
  position: [number, number] | null; 
  setPosition: (pos: [number, number]) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function LocationPicker({ 
  isOpen, 
  onClose, 
  onLocationSelect, 
  initialLocation 
}: LocationPickerProps) {
  const { t } = useTranslation();
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  );
  const [address, setAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]); // Bangkok default

  useEffect(() => {
    if (initialLocation) {
      setMapCenter([initialLocation.lat, initialLocation.lng]);
      setSelectedPosition([initialLocation.lat, initialLocation.lng]);
    } else {
      // Try to get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
            setMapCenter(pos);
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }
    }
  }, [initialLocation]);

  useEffect(() => {
    if (selectedPosition) {
      reverseGeocode(selectedPosition[0], selectedPosition[1]);
    }
  }, [selectedPosition]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      onLocationSelect(selectedPosition[0], selectedPosition[1], address);
      onClose();
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setSelectedPosition(pos);
          setMapCenter(pos);
        },
        (error) => {
          console.error('Error getting current location:', error);
          toast.error(t('toast.location_error'));
        }
      );
    } else {
      toast.error(t('toast.geolocation_not_supported'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden m-4">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">{t('location_picker.title')}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {t('location_picker.instruction')}
          </p>
        </div>

        <div className="relative">
          <div className="h-96">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker
                position={selectedPosition}
                setPosition={setSelectedPosition}
              />
            </MapContainer>
          </div>

          <div className="absolute top-4 right-4 z-[1000]">
            <button
              onClick={handleCurrentLocation}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition text-sm"
            >
              📍 {t('location_picker.use_current_location')}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('location_picker.selected_location')}:
            </label>
            {selectedPosition ? (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-800">
                  <strong>{t('dashboard.coordinates')}:</strong> {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>{t('dashboard.address')}:</strong> {' '}
                  {isLoadingAddress ? (
                    <span className="text-gray-500">{t('location_picker.loading_address')}</span>
                  ) : (
                    address
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                {t('location_picker.no_location_selected')}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={!selectedPosition}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {t('location_picker.confirm_location')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
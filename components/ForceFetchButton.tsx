'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ForceFetchButtonProps {
  onDataUpdated?: () => void;
}

const ForceFetchButton = ({ onDataUpdated }: ForceFetchButtonProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleForceFetch = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const loadingToast = toast.loading(t('force_fetch.fetching'));

    try {
      const response = await fetch('/api/weather/force-fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(t('force_fetch.success'), { id: loadingToast });
        
        // Call the callback to refresh data
        if (onDataUpdated) {
          onDataUpdated();
        }
      } else {
        toast.error(data.error || t('force_fetch.failed'), { id: loadingToast });
      }
    } catch (error) {
      console.error('Force fetch error:', error);
      toast.error(t('force_fetch.error'), { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleForceFetch}
      disabled={isLoading}
      className={`
        fixed top-20 right-4 z-[1000]
        w-10 h-10 
        bg-blue-600 hover:bg-blue-700 
        text-white 
        rounded-full 
        shadow-lg hover:shadow-xl 
        transition-all duration-200 
        flex items-center justify-center
        ${isLoading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
        group
        md:top-4 md:right-20 md:w-12 md:h-12
      `}
      title={t('force_fetch.button_title')}
    >
      <RefreshCw 
        className={`w-4 h-4 md:w-5 md:h-5 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} 
      />
    </button>
  );
};

export default ForceFetchButton;
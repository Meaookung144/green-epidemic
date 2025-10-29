'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { MessageSquare, Cloud, CheckCircle, XCircle } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  icon: React.ReactNode;
}

interface IntegrationsSectionProps {
  user: {
    lineOfficialConnected?: boolean;
    googleSyncEnabled?: boolean;
  };
  onUpdate?: () => void;
}

const IntegrationsSection = ({ user, onUpdate }: IntegrationsSectionProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  const integrations: Integration[] = [
    {
      id: 'line_official',
      name: t('integration.line_official'),
      description: t('integration.line_description'),
      connected: user.lineOfficialConnected || false,
      icon: <MessageSquare className="w-6 h-6" />
    },
    {
      id: 'google_sync',
      name: t('integration.google_sync'),
      description: t('integration.google_description'),
      connected: user.googleSyncEnabled || false,
      icon: <Cloud className="w-6 h-6" />
    }
  ];

  const handleToggleIntegration = async (integrationId: string, currentlyConnected: boolean) => {
    if (loading) return;

    setLoading(integrationId);
    const action = currentlyConnected ? 'disconnect' : 'connect';
    const loadingMessage = currentlyConnected ? 
      'Disconnecting...' : 'Connecting...';
    
    const loadingToast = toast.loading(loadingMessage);

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: currentlyConnected ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        const successMessage = currentlyConnected ? 
          t('integration.disconnect_success') : 
          t('integration.connect_success');
        
        toast.success(successMessage, { id: loadingToast });
        
        // Callback to refresh user data
        if (onUpdate) {
          onUpdate();
        }
      } else {
        const errorMessage = currentlyConnected ? 
          t('integration.disconnect_failed') : 
          t('integration.connect_failed');
        
        toast.error(data.error || errorMessage, { id: loadingToast });
      }
    } catch (error) {
      console.error('Integration toggle error:', error);
      const errorMessage = currentlyConnected ? 
        t('integration.disconnect_failed') : 
        t('integration.connect_failed');
      
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{t('integration.title')}</h2>
      
      <div className="space-y-4">
        {integrations.map((integration) => (
          <div 
            key={integration.id} 
            className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${integration.connected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {integration.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{integration.name}</h3>
                  {integration.connected ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('integration.connected')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-gray-400">
                      <XCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('integration.not_connected')}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </div>
            </div>
            
            <button
              onClick={() => handleToggleIntegration(integration.id, integration.connected)}
              disabled={loading === integration.id}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors min-w-[100px] ${
                integration.connected
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${loading === integration.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading === integration.id ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                </div>
              ) : (
                integration.connected ? t('integration.disconnect') : t('integration.connect')
              )}
            </button>
          </div>
        ))}
      </div>
      
      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="p-1 bg-blue-200 text-blue-700 rounded-full mt-0.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-1">Information</h4>
            <p className="text-sm text-blue-700">
              Connected services will send you notifications about environmental conditions and health reports in your surveillance areas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsSection;
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Flame, Satellite, RefreshCw, Database, Clock, TrendingUp } from 'lucide-react';

interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  brightness?: number;
  confidence?: number;
  acquisitionDate: string;
  satellite: string;
  frp?: number;
  isActive: boolean;
}

interface SyncResult {
  message: string;
  source: string;
  area: string;
  days: number;
  totalProcessed: number;
  inserted: number;
  updated: number;
  errors: number;
  deactivated: number;
}

export default function HotspotsAdminPage() {
  const { data: session } = useSession();
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lastSync: null as string | null,
    averageConfidence: 0
  });

  useEffect(() => {
    fetchHotspots();
  }, []);

  const fetchHotspots = async () => {
    try {
      const response = await fetch('/api/hotspots?days=7&limit=100');
      if (response.ok) {
        const data = await response.json();
        setHotspots(data.hotspots || []);
        calculateStats(data.hotspots || []);
      }
    } catch (error) {
      console.error('Error fetching hotspots:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (hotspotData: Hotspot[]) => {
    const active = hotspotData.filter(h => h.isActive).length;
    const totalConfidence = hotspotData
      .filter(h => h.confidence)
      .reduce((sum, h) => sum + (h.confidence || 0), 0);
    const avgConfidence = hotspotData.filter(h => h.confidence).length > 0 
      ? totalConfidence / hotspotData.filter(h => h.confidence).length 
      : 0;

    setStats({
      total: hotspotData.length,
      active,
      lastSync: hotspotData.length > 0 ? hotspotData[0].acquisitionDate : null,
      averageConfidence: Math.round(avgConfidence)
    });
  };

  const syncHotspots = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/hotspots/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area: 'THAILAND', // Thailand region for more focused data
          days: 1,
          source: 'MODIS_NRT'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSyncResult(result);
        await fetchHotspots(); // Refresh data
      } else {
        const error = await response.json();
        console.error('Sync failed:', error);
        setSyncResult({
          message: `Sync failed: ${error.error}`,
          source: 'MODIS_NRT',
          area: 'THAILAND',
          days: 1,
          totalProcessed: 0,
          inserted: 0,
          updated: 0,
          errors: 1,
          deactivated: 0
        });
      }
    } catch (error) {
      console.error('Error syncing hotspots:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 90) return 'bg-red-100 text-red-800';
    if (confidence >= 75) return 'bg-orange-100 text-orange-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Hotspot Management</h1>
            <p className="text-gray-600">Manage NASA FIRMS fire hotspot data</p>
          </div>
          <button
            onClick={syncHotspots}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Database className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hotspots</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Fires</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageConfidence}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Detection</p>
              <p className="text-sm font-bold text-gray-900">
                {stats.lastSync ? new Date(stats.lastSync).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Sync Result</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Processed:</span>
              <span className="ml-2 text-gray-900">{syncResult.totalProcessed}</span>
            </div>
            <div>
              <span className="font-medium text-green-600">Inserted:</span>
              <span className="ml-2 text-green-800">{syncResult.inserted}</span>
            </div>
            <div>
              <span className="font-medium text-blue-600">Updated:</span>
              <span className="ml-2 text-blue-800">{syncResult.updated}</span>
            </div>
            <div>
              <span className="font-medium text-red-600">Errors:</span>
              <span className="ml-2 text-red-800">{syncResult.errors}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Deactivated:</span>
              <span className="ml-2 text-gray-800">{syncResult.deactivated}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">{syncResult.message}</p>
        </div>
      )}

      {/* Hotspots Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satellite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fire Power
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detection Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hotspots.map((hotspot) => (
                <tr key={hotspot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Satellite className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{hotspot.satellite}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {hotspot.confidence ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(hotspot.confidence)}`}>
                        {hotspot.confidence}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {hotspot.frp ? `${hotspot.frp.toFixed(1)} MW` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(hotspot.acquisitionDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      hotspot.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {hotspot.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hotspots.length === 0 && (
          <div className="text-center py-12">
            <Flame className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hotspots found</h3>
            <p className="mt-1 text-sm text-gray-500">Sync data to load fire hotspot information.</p>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { BarChart3, TrendingUp, Users, FileText, AlertTriangle, Activity } from 'lucide-react';

interface StatisticsData {
  overview: {
    totalUsers: number;
    totalReports: number;
    pendingReports: number;
    approvedReports: number;
    rejectedReports: number;
    totalAnalyses: number;
    highRiskAssessments: number;
  };
  trends: {
    dailyReports: Array<{
      date: string;
      count: number;
    }>;
    weeklyUsers: Array<{
      week: string;
      count: number;
    }>;
    reportsByType: Array<{
      type: string;
      count: number;
    }>;
    severityDistribution: Array<{
      severity: string;
      count: number;
    }>;
  };
  geographical: {
    provinceStats: Array<{
      province: string;
      reportCount: number;
      userCount: number;
    }>;
  };
}

export default function StatisticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`/api/admin/stats?range=${timeRange}`);
      if (response.ok) {
        const statsData = await response.json();
        setData(statsData);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load statistics</h3>
          <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Statistics & Analytics</h1>
            <p className="text-gray-600">Comprehensive overview of system usage and health data</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalReports.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Reports</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.pendingReports.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Activity className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.highRiskAssessments.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Report Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Status Distribution</h3>
          <div className="space-y-4">
            {[
              { label: 'Approved', count: data.overview.approvedReports, color: 'bg-green-500' },
              { label: 'Pending', count: data.overview.pendingReports, color: 'bg-yellow-500' },
              { label: 'Rejected', count: data.overview.rejectedReports, color: 'bg-red-500' },
            ].map((item) => {
              const percentage = ((item.count / data.overview.totalReports) * 100) || 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`${item.color} rounded-full h-2`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Types */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reports by Type</h3>
          <div className="space-y-3">
            {data.trends.reportsByType.map((item, index) => (
              <div key={item.type} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{item.type}</span>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">{item.count}</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 rounded-full h-2"
                      style={{ 
                        width: `${(item.count / Math.max(...data.trends.reportsByType.map(r => r.count))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Reports Trend */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Reports Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {data.trends.dailyReports.map((day, index) => {
            const maxCount = Math.max(...data.trends.dailyReports.map(d => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-blue-500 rounded-t w-full min-h-[4px]"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${day.count} reports`}
                ></div>
                <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-center">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Geographical Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Reports by Province</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Province
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reports per User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.geographical.provinceStats.map((province) => (
                <tr key={province.province}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {province.province}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {province.reportCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {province.userCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {province.userCount > 0 ? (province.reportCount / province.userCount).toFixed(1) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  severity: number;
  latitude: number;
  longitude: number;
  address: string;
  symptoms: string[];
  reportDate: string;
  user: {
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: {
    reports: number;
    surveillancePoints: number;
  };
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'stats'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    pendingReports: 0,
    approvedReports: 0,
    rejectedReports: 0
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const res = await fetch('/api/admin/reports');
        const data = await res.json();
        setReports(data);
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        setUsers(data);
      } else if (activeTab === 'stats') {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          adminId: (session?.user as any)?.id 
        }),
      });

      if (res.ok) {
        fetchData();
        toast.success(action === 'approve' ? t('toast.report_approved') : t('toast.report_rejected'));
      }
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error(t('toast.report_update_failed'));
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchData();
        toast.success(t('toast.user_updated'));
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('toast.user_update_failed'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return 'text-green-600';
    if (severity <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:hidden">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="block w-full rounded-md border-gray-300 focus:border-green-500 focus:ring-green-500"
        >
          <option value="reports">Reports</option>
          <option value="users">Users</option>
          <option value="stats">Statistics</option>
        </select>
      </div>
      
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports Management
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
          </nav>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'reports' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {reports.map((report) => (
                    <li key={report.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{report.title}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                                  {report.status}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Type: {report.type}
                                </span>
                                <span className={`text-sm font-medium ${getSeverityColor(report.severity)}`}>
                                  Severity: {report.severity}/5
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            <p>{report.description}</p>
                            <p className="mt-1">
                              <strong>Symptoms:</strong> {report.symptoms.join(', ')}
                            </p>
                            <p className="mt-1">
                              <strong>Location:</strong> {report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                            </p>
                            <p className="mt-1">
                              <strong>Reported by:</strong> {report.user.name} ({report.user.email})
                            </p>
                            <p className="mt-1">
                              <strong>Date:</strong> {new Date(report.reportDate).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {report.status === 'PENDING' && (
                          <div className="ml-4 flex-shrink-0 flex space-x-2">
                            <button
                              onClick={() => handleReportAction(report.id, 'approve')}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReportAction(report.id, 'reject')}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                            <span>Reports: {user._count.reports}</span>
                            <span>Surveillance Points: {user._count.surveillancePoints}</span>
                            <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={user.role}
                            onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                            className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalUsers}</dd>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Reports</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalReports}</dd>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Reports</dt>
                    <dd className="mt-1 text-3xl font-semibold text-yellow-600">{stats.pendingReports}</dd>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Approved Reports</dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.approvedReports}</dd>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Rejected Reports</dt>
                    <dd className="mt-1 text-3xl font-semibold text-red-600">{stats.rejectedReports}</dd>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
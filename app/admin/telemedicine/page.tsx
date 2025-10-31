'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Video, Clock, User, CheckCircle, XCircle, Calendar, Eye } from 'lucide-react';

interface TelemedConsultation {
  id: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  roomId?: string;
  callUrl?: string;
  notes?: string;
  patient: {
    id: string;
    name: string;
    email: string;
  };
  doctor?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface TelemedStats {
  totalConsultations: number;
  scheduledConsultations: number;
  completedConsultations: number;
  activeConsultations: number;
  cancelledConsultations: number;
  averageDuration: number;
}

export default function TelemedicinePage() {
  const { data: session } = useSession();
  const [consultations, setConsultations] = useState<TelemedConsultation[]>([]);
  const [stats, setStats] = useState<TelemedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<TelemedConsultation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchConsultations();
    fetchStats();
  }, [filterStatus]);

  const fetchConsultations = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/admin/consultations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations || []);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/consultations?stats=true');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching telemedicine stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.SCHEDULED}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'IN_PROGRESS':
        return <Video className="h-4 w-4 text-green-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Telemedicine Management</h1>
            <p className="text-gray-600">Monitor and manage telemedicine consultations</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Video className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalConsultations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduledConsultations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Video className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeConsultations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedConsultations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.averageDuration)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consultations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consultations.map((consultation) => (
                <tr key={consultation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{consultation.patient.name}</div>
                        <div className="text-sm text-gray-500">{consultation.patient.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {consultation.doctor ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{consultation.doctor.name}</div>
                        <div className="text-sm text-gray-500">{consultation.doctor.email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(consultation.status)}
                      <span className="ml-2">{getStatusBadge(consultation.status)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(consultation.scheduledAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {consultation.duration ? formatDuration(consultation.duration) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {consultation.roomId ? (
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {consultation.roomId.slice(0, 8)}...
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedConsultation(consultation)}
                        className="text-green-600 hover:text-green-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {consultation.status === 'IN_PROGRESS' && consultation.callUrl && (
                        <a
                          href={consultation.callUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                          title="Join Call"
                        >
                          <Video className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {consultations.length === 0 && (
          <div className="text-center py-12">
            <Video className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No consultations found</h3>
            <p className="mt-1 text-sm text-gray-500">No consultations match the current filter.</p>
          </div>
        )}
      </div>

      {/* Consultation Detail Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Consultation Details</h2>
                  <p className="text-sm text-gray-500">ID: {selectedConsultation.id}</p>
                </div>
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Patient Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm mb-2"><strong>Name:</strong> {selectedConsultation.patient.name}</p>
                    <p className="text-sm mb-2"><strong>Email:</strong> {selectedConsultation.patient.email}</p>
                    <p className="text-sm"><strong>Patient ID:</strong> {selectedConsultation.patient.id}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Doctor Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedConsultation.doctor ? (
                      <>
                        <p className="text-sm mb-2"><strong>Name:</strong> {selectedConsultation.doctor.name}</p>
                        <p className="text-sm mb-2"><strong>Email:</strong> {selectedConsultation.doctor.email}</p>
                        <p className="text-sm"><strong>Doctor ID:</strong> {selectedConsultation.doctor.id}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No doctor assigned</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Consultation Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <div className="flex items-center">
                      {getStatusIcon(selectedConsultation.status)}
                      <span className="ml-2">{getStatusBadge(selectedConsultation.status)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Scheduled:</span>
                    <span className="text-sm">{new Date(selectedConsultation.scheduledAt).toLocaleString()}</span>
                  </div>
                  {selectedConsultation.startedAt && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Started:</span>
                      <span className="text-sm">{new Date(selectedConsultation.startedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedConsultation.endedAt && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Ended:</span>
                      <span className="text-sm">{new Date(selectedConsultation.endedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedConsultation.duration && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Duration:</span>
                      <span className="text-sm">{formatDuration(selectedConsultation.duration)}</span>
                    </div>
                  )}
                  {selectedConsultation.roomId && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Room ID:</span>
                      <span className="text-sm font-mono">{selectedConsultation.roomId}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedConsultation.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedConsultation.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
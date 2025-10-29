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

interface AIAnalysis {
  id: string;
  title: string;
  summary: string;
  analysis: string;
  recommendations: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  weatherDataCount: number;
  reportsCount: number;
  generatedBy: string;
  createdAt: string;
}

interface AIAnalysisHistory {
  id: string;
  title: string;
  summary: string;
  severity: string;
  confidence: number;
  generatedBy: string;
  weatherDataCount: number;
  reportsCount: number;
  createdAt: string;
}

interface RiskAssessment {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string | null;
  primarySymptoms: string[];
  severity: number;
  duration: string;
  riskLevel: string;
  priority: string;
  recommendation: string;
  notes: string | null;
  doctorConsultation: boolean;
  doctorNotes: string | null;
  doctorRecommendation: string | null;
  consultationDate: string | null;
  assessedBy: string;
  location: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  
  // Check if user has appropriate permissions
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';
  const isVolunteer = userRole === 'VOLUNTEER';
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'stats' | 'ai-analysis' | 'risk-assessment' | 'telemedicine' | 'ai-chat-history'>('reports');
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
  const [analysisHistory, setAnalysisHistory] = useState<AIAnalysisHistory[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [aiChatHistory, setAiChatHistory] = useState<any[]>([]);
  const [selectedChatSession, setSelectedChatSession] = useState<any>(null);

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
      } else if (activeTab === 'ai-analysis') {
        const res = await fetch('/api/admin/ai-analysis');
        const data = await res.json();
        setAnalysisHistory(data);
      } else if (activeTab === 'risk-assessment') {
        const res = await fetch('/api/risk-assessment');
        if (res.ok) {
          const data = await res.json();
          setAssessments(data.assessments);
        }
      } else if (activeTab === 'telemedicine') {
        const res = await fetch('/api/admin/consultations');
        if (res.ok) {
          const data = await res.json();
          setConsultations(data.consultations);
        }
      } else if (activeTab === 'ai-chat-history') {
        const res = await fetch('/api/admin/ai-chat-history');
        if (res.ok) {
          const data = await res.json();
          setAiChatHistory(data.chatSessions);
        }
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGenerateAnalysis = async (force: boolean = false) => {
    setGeneratingAnalysis(true);
    try {
      const res = await fetch('/api/admin/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hoursBack: 24,
          force 
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        if (data.generated) {
          toast.success(t('toast.ai_analysis_generated'));
        } else {
          toast.success(t('toast.ai_analysis_recent'));
        }
        setSelectedAnalysis(data.analysis);
        fetchData(); // Refresh the history
      } else {
        toast.error(data.error || t('toast.ai_analysis_failed'));
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast.error(t('toast.ai_analysis_error'));
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const handleViewAnalysis = async (analysisId: string) => {
    try {
      const res = await fetch(`/api/admin/ai-analysis?id=${analysisId}`);
      if (res.ok) {
        const analysis = await res.json();
        setSelectedAnalysis(analysis);
      } else {
        toast.error(t('toast.ai_analysis_load_failed'));
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
      toast.error(t('toast.ai_analysis_load_error'));
    }
  };

  const getReportSeverityColor = (severity: number) => {
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
          {isAdmin && <option value="users">Users</option>}
          <option value="stats">Statistics</option>
          <option value="ai-analysis">AI Analysis</option>
          <option value="risk-assessment">Risk Assessment</option>
          <option value="telemedicine">Telemedicine</option>
          <option value="ai-chat-history">AI Chat History</option>
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
            {isAdmin && (
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
            )}
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
            <button
              onClick={() => setActiveTab('ai-analysis')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ai-analysis'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤖 AI Analysis
            </button>
            <button
              onClick={() => setActiveTab('risk-assessment')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'risk-assessment'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏥 Risk Assessment
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
                                <span className={`text-sm font-medium ${getReportSeverityColor(report.severity)}`}>
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

            {activeTab === 'users' && isAdmin && (
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

            {activeTab === 'ai-analysis' && (
              <div className="space-y-6">
                {/* Generate Analysis Section */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">🤖 AI Environmental Analysis</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleGenerateAnalysis(false)}
                          disabled={generatingAnalysis}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                        >
                          {generatingAnalysis ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            'Generate Analysis'
                          )}
                        </button>
                        <button
                          onClick={() => handleGenerateAnalysis(true)}
                          disabled={generatingAnalysis}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                        >
                          Force Generate
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Generate AI-powered environmental health analysis based on current weather data and health reports.
                    </p>
                  </div>
                </div>

                {/* Analysis History */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Analysis History</h3>
                  </div>
                  <div className="p-6">
                    {analysisHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">📊</div>
                        <p className="text-gray-500 mb-4">No AI analyses available yet</p>
                        <p className="text-sm text-gray-400">Generate your first analysis to see insights here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {analysisHistory.map((analysis) => (
                          <div 
                            key={analysis.id} 
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
                            onClick={() => handleViewAnalysis(analysis.id)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900 flex-1">{analysis.title}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ml-2 ${getSeverityColor(analysis.severity)}`}>
                                {analysis.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{analysis.summary}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <div className="flex space-x-4">
                                <span>📊 {analysis.weatherDataCount} data points</span>
                                <span>📋 {analysis.reportsCount} reports</span>
                                <span>👤 {analysis.generatedBy}</span>
                              </div>
                              <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 mr-2">Confidence:</span>
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${analysis.confidence * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500 ml-2">{Math.round(analysis.confidence * 100)}%</span>
                              </div>
                              <span className="text-xs text-blue-600 hover:text-blue-800">View Details →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'risk-assessment' && (
              <div className="space-y-6">
                {/* Risk Assessment Overview */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">🏥 Risk Assessment History</h3>
                      <a
                        href="/risk-assessment"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                      >
                        + New Assessment
                      </a>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      View and manage patient risk assessments and triage decisions.
                    </p>
                  </div>
                </div>

                {/* Risk Assessment Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Assessments</dt>
                      <dd className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">
                        {assessments.length}
                      </dd>
                    </div>
                  </div>
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Critical Cases</dt>
                      <dd className="mt-1 text-2xl sm:text-3xl font-semibold text-red-600">
                        {assessments.filter(a => a.riskLevel === 'CRITICAL').length}
                      </dd>
                    </div>
                  </div>
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">High Risk</dt>
                      <dd className="mt-1 text-2xl sm:text-3xl font-semibold text-orange-600">
                        {assessments.filter(a => a.riskLevel === 'HIGH').length}
                      </dd>
                    </div>
                  </div>
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Doctor Consultations</dt>
                      <dd className="mt-1 text-2xl sm:text-3xl font-semibold text-blue-600">
                        {assessments.filter(a => a.doctorConsultation).length}
                      </dd>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Risk Assessments</h3>
                  </div>
                  {assessments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-4xl mb-4">🏥</div>
                      <p className="text-gray-500 mb-4">No risk assessments found</p>
                      <p className="text-sm text-gray-400">Assessments will appear here as they are created</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {assessments.slice(0, 20).map((assessment) => (
                        <li key={assessment.id} className="px-4 py-4 sm:px-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-lg font-medium text-gray-900 truncate">
                                  {assessment.patientName}
                                </h4>
                                <div className="flex flex-wrap gap-2 ml-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    assessment.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                    assessment.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                    assessment.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {assessment.riskLevel}
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    assessment.priority === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                                    assessment.priority === 'URGENT' ? 'bg-orange-100 text-orange-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {assessment.priority}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Age:</span> {assessment.patientAge}
                                </div>
                                <div>
                                  <span className="font-medium">Gender:</span> {assessment.patientGender}
                                </div>
                                <div>
                                  <span className="font-medium">Severity:</span> {assessment.severity}/5
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <span className="font-medium">Symptoms:</span> {assessment.primarySymptoms.join(', ')}
                                </div>
                                <div>
                                  <span className="font-medium">Recommendation:</span> {assessment.recommendation.replace('_', ' ')}
                                </div>
                                <div>
                                  <span className="font-medium">Date:</span> {new Date(assessment.createdAt).toLocaleDateString()}
                                </div>
                                {assessment.doctorConsultation && (
                                  <div className="flex items-center text-blue-600">
                                    <span className="mr-1">👨‍⚕️</span>
                                    <span className="text-xs">Doctor Consulted</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => setSelectedAssessment(assessment)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">AI Environmental Analysis Details</h2>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{selectedAnalysis.title}</h3>
                  <span className={`px-3 py-1 text-sm rounded-full ${getSeverityColor(selectedAnalysis.severity)}`}>
                    {selectedAnalysis.severity}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <span>📊 {selectedAnalysis.weatherDataCount} data points</span>
                  <span>📋 {selectedAnalysis.reportsCount} reports</span>
                  <span>👤 Generated by: {selectedAnalysis.generatedBy}</span>
                  <span>📅 {new Date(selectedAnalysis.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center">
                    <span className="mr-2">Confidence: {Math.round(selectedAnalysis.confidence * 100)}%</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${selectedAnalysis.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">📋 Executive Summary</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedAnalysis.summary}</p>
                </div>

                {selectedAnalysis.analysis && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">🔍 Detailed Analysis</h4>
                    <div className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                      {selectedAnalysis.analysis}
                    </div>
                  </div>
                )}

                {selectedAnalysis.recommendations && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">💡 Recommendations</h4>
                    <div className="text-gray-700 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 whitespace-pre-wrap">
                      {selectedAnalysis.recommendations}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleGenerateAnalysis(true)}
                  disabled={generatingAnalysis}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm"
                >
                  Generate New Analysis
                </button>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
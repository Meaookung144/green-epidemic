'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Shield, AlertTriangle, TrendingUp, Eye, Filter, Download } from 'lucide-react';

interface RiskAssessment {
  id: string;
  userId: string;
  location: string;
  riskFactors: string[];
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  environmentalFactors: any;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function RiskAssessmentPage() {
  const { data: session } = useSession();
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    fetchAssessments();
  }, [filterLevel]);

  const fetchAssessments = async () => {
    try {
      const params = new URLSearchParams();
      if (filterLevel !== 'all') {
        params.append('riskLevel', filterLevel);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/risk-assessment?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error('Error fetching risk assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const colors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[riskLevel as keyof typeof colors] || colors.LOW}`}>
        {riskLevel}
      </span>
    );
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'MEDIUM':
        return <Shield className="h-5 w-5 text-yellow-500" />;
      default:
        return <Shield className="h-5 w-5 text-green-500" />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Risk Assessment Management</h1>
            <p className="text-gray-600">Monitor and analyze health risk assessments</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Risk Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
          const count = assessments.filter(a => a.riskLevel === level).length;
          return (
            <div key={level} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-100">
                  {getRiskIcon(level)}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{level} Risk</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assessments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Factors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{assessment.user.name}</div>
                      <div className="text-sm text-gray-500">{assessment.user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{assessment.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-lg font-bold ${getRiskScoreColor(assessment.riskScore)}`}>
                        {assessment.riskScore}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">/100</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(assessment.riskLevel)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(assessment.riskFactors || []).length} factors
                    </div>
                    <div className="text-sm text-gray-500">
                      {(assessment.riskFactors || []).slice(0, 2).join(', ')}
                      {(assessment.riskFactors || []).length > 2 && '...'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(assessment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedAssessment(assessment)}
                        className="text-green-600 hover:text-green-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        title="Download Report"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {assessments.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No risk assessments found</h3>
            <p className="mt-1 text-sm text-gray-500">No assessments match the current filter.</p>
          </div>
        )}
      </div>

      {/* Assessment Detail Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Risk Assessment Details</h2>
                  <p className="text-sm text-gray-500">Assessment ID: {selectedAssessment.id}</p>
                </div>
                <button
                  onClick={() => setSelectedAssessment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">User Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm mb-2"><strong>Name:</strong> {selectedAssessment.user.name}</p>
                    <p className="text-sm mb-2"><strong>Email:</strong> {selectedAssessment.user.email}</p>
                    <p className="text-sm mb-2"><strong>Location:</strong> {selectedAssessment.location}</p>
                    <p className="text-sm"><strong>Assessment Date:</strong> {new Date(selectedAssessment.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Risk Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Risk Score:</span>
                      <span className={`text-xl font-bold ${getRiskScoreColor(selectedAssessment.riskScore)}`}>
                        {selectedAssessment.riskScore}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Level:</span>
                      {getRiskBadge(selectedAssessment.riskLevel)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Risk Factors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedAssessment.riskFactors || []).map((factor, index) => (
                    <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{factor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedAssessment.recommendations && selectedAssessment.recommendations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Recommendations</h3>
                  <div className="space-y-3">
                    {selectedAssessment.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAssessment.environmentalFactors && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Environmental Factors</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedAssessment.environmentalFactors, null, 2)}
                    </pre>
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
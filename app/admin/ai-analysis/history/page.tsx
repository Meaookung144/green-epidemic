'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Brain, Clock, TrendingUp, Download, Eye } from 'lucide-react';
import Link from 'next/link';

interface AIAnalysisHistory {
  id: string;
  title: string;
  analysis: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  generatedBy: string;
  createdAt: string;
  dataPoints: number;
}

export default function AIAnalysisHistoryPage() {
  const { data: session } = useSession();
  const [analyses, setAnalyses] = useState<AIAnalysisHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalysisHistory();
  }, [selectedTimeRange]);

  const fetchAnalysisHistory = async () => {
    try {
      const response = await fetch(`/api/admin/ai-analysis?range=${selectedTimeRange}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.analyses || []);
      }
    } catch (error) {
      console.error('Error fetching analysis history:', error);
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[riskLevel as keyof typeof colors] || colors.LOW}`}>
        {riskLevel}
      </span>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Analysis History</h1>
            <p className="text-gray-600">Browse and review historical AI analysis reports</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
            <Link
              href="/admin/ai-analysis"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              Generate New
            </Link>
          </div>
        </div>
      </div>

      {/* Analysis Timeline */}
      <div className="space-y-6">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{analysis.title}</h3>
                    {getRiskBadge(analysis.riskLevel)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(analysis.createdAt).toLocaleString()}
                    </div>
                    <span>By: {analysis.generatedBy}</span>
                    <span>Data Points: {analysis.dataPoints}</span>
                    <span className={`font-medium ${getConfidenceColor(analysis.confidence)}`}>
                      {analysis.confidence}% confidence
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/api/ai-analysis/${analysis.id}`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Link>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>

              <div className="text-gray-700">
                <p className="line-clamp-3">{analysis.analysis}</p>
              </div>

              {/* Analysis Metrics */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-gray-600">Risk Assessment</span>
                    </div>
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-gray-600">AI Generated</span>
                    </div>
                  </div>
                  <div className="text-gray-500">
                    ID: {analysis.id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {analyses.length === 0 && (
        <div className="text-center py-12">
          <Brain className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis history found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No AI analyses found for the selected time range.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/ai-analysis"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              Generate Analysis
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
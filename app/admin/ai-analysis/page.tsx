'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Brain, RefreshCw, TrendingUp, AlertTriangle, Eye, Download } from 'lucide-react';

interface AIAnalysis {
  id: string;
  title: string;
  analysis: string;
  insights: string[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  generatedBy: string;
  createdAt: string;
  dataPoints: number;
  weatherDataCount: number;
  reportsCount: number;
  bulkHealthStatsCount: number;
}

export default function AIAnalysisPage() {
  const { data: session } = useSession();
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/admin/ai-analysis');
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.analyses || []);
      }
    } catch (error) {
      console.error('Error fetching AI analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewAnalysis = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/ai-analysis', {
        method: 'POST',
      });

      if (response.ok) {
        const newAnalysis = await response.json();
        setAnalyses([newAnalysis, ...analyses]);
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateAutoAnalysis = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/ai-analysis/auto', {
        method: 'POST',
      });

      if (response.ok) {
        fetchAnalyses(); // Refresh the list
      }
    } catch (error) {
      console.error('Error generating auto analysis:', error);
    } finally {
      setGenerating(false);
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Analysis</h1>
            <p className="text-gray-600">Generate and manage AI-powered health insights</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={generateAutoAnalysis}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Auto Analysis
            </button>
            <button
              onClick={generateNewAnalysis}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Generate Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Cards */}
      <div className="grid gap-6">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{analysis.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Generated: {new Date(analysis.createdAt).toLocaleString()}</span>
                    <span>By: {analysis.generatedBy}</span>
                    <span>Data Points: {analysis.dataPoints}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getRiskBadge(analysis.riskLevel)}
                  <span className={`text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}>
                    {analysis.confidence}% confidence
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 line-clamp-3">{analysis.analysis}</p>
              </div>

              {/* Data Sources */}
              <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Weather: {analysis.weatherDataCount}
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Reports: {analysis.reportsCount}
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  Health Stats: {analysis.bulkHealthStatsCount}
                </div>
              </div>

              {/* Key Insights Preview */}
              {analysis.insights && analysis.insights.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Insights:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {analysis.insights.slice(0, 3).map((insight, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {insight}
                      </li>
                    ))}
                    {analysis.insights.length > 3 && (
                      <li className="text-gray-500 italic">+{analysis.insights.length - 3} more insights...</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedAnalysis(analysis)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {analyses.length === 0 && (
        <div className="text-center py-12">
          <Brain className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No AI analyses found</h3>
          <p className="mt-1 text-sm text-gray-500">Generate your first AI analysis to get started.</p>
          <div className="mt-6">
            <button
              onClick={generateNewAnalysis}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              Generate First Analysis
            </button>
          </div>
        </div>
      )}

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedAnalysis.title}</h2>
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAnalysis.analysis}</p>
                </div>

                {selectedAnalysis.insights && selectedAnalysis.insights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Key Insights</h3>
                    <ul className="space-y-2">
                      {selectedAnalysis.insights.map((insight, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2 mt-1">•</span>
                          <span className="text-gray-700">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAnalysis.recommendations && selectedAnalysis.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Recommendations</h3>
                    <ul className="space-y-2">
                      {selectedAnalysis.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2 mt-1">→</span>
                          <span className="text-gray-700">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
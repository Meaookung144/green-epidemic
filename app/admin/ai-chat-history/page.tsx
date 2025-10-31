'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { MessageSquareText, User, AlertTriangle, Clock, Filter } from 'lucide-react';

interface AIChat {
  id: string;
  sessionId: string;
  userId: string;
  messages: any[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  shouldConsultDoctor: boolean;
  recommendations: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface FilterOptions {
  riskLevel: string;
  shouldConsultDoctor: string;
  userId: string;
  startDate: string;
  endDate: string;
}

export default function AIChatHistoryPage() {
  const { data: session } = useSession();
  const [chats, setChats] = useState<AIChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<AIChat | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    riskLevel: '',
    shouldConsultDoctor: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false,
  });

  useEffect(() => {
    fetchChats();
  }, [filters, pagination.offset]);

  const fetchChats = async () => {
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/admin/ai-chat-history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chatSessions || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasMore || false,
        }));
      }
    } catch (error) {
      console.error('Error fetching AI chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string | null) => {
    if (!riskLevel) return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Unknown</span>;
    
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

  const getMessageCount = (messages: any[]) => {
    return messages ? messages.length : 0;
  };

  const getLastMessage = (messages: any[]) => {
    if (!messages || messages.length === 0) return 'No messages';
    const lastMsg = messages[messages.length - 1];
    return lastMsg.content || lastMsg.message || 'Empty message';
  };

  const clearFilters = () => {
    setFilters({
      riskLevel: '',
      shouldConsultDoctor: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
    setPagination(prev => ({ ...prev, offset: 0 }));
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Chat History</h1>
        <p className="text-gray-600">Monitor and analyze AI health chat sessions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Levels</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Consultation</label>
            <select
              value={filters.shouldConsultDoctor}
              onChange={(e) => setFilters(prev => ({ ...prev, shouldConsultDoctor: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Recommended</option>
              <option value="false">Not Recommended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: 0 }))}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
            >
              <Filter className="h-4 w-4 inline mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor Consultation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chats.map((chat) => (
                <tr key={chat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{chat.user.name}</div>
                        <div className="text-sm text-gray-500">{chat.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getMessageCount(chat.messages)} messages</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {getLastMessage(chat.messages)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(chat.riskLevel)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {chat.shouldConsultDoctor ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        Recommended
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Not Needed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedChat(chat)}
                      className="text-green-600 hover:text-green-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {chats.length === 0 && (
          <div className="text-center py-12">
            <MessageSquareText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No chat sessions found</h3>
            <p className="mt-1 text-sm text-gray-500">No AI chat sessions match the current filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={pagination.offset === 0}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={!pagination.hasMore}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Chat Detail Modal */}
      {selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Chat Session Details</h2>
                  <p className="text-sm text-gray-500">Session ID: {selectedChat.sessionId}</p>
                </div>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">User Information</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm"><strong>Name:</strong> {selectedChat.user.name}</p>
                    <p className="text-sm"><strong>Email:</strong> {selectedChat.user.email}</p>
                    <p className="text-sm"><strong>Role:</strong> {selectedChat.user.role}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Assessment</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm mb-1"><strong>Risk Level:</strong> {selectedChat.riskLevel || 'Not assessed'}</p>
                    <p className="text-sm"><strong>Doctor Consultation:</strong> {selectedChat.shouldConsultDoctor ? 'Recommended' : 'Not needed'}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Conversation</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedChat.messages && selectedChat.messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content || message.message}</p>
                        {message.timestamp && (
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {selectedChat.recommendations && selectedChat.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">AI Recommendations</h3>
                  <ul className="space-y-2">
                    {selectedChat.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2 mt-1">•</span>
                        <span className="text-sm text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
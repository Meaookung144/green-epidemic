'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { BarChart3, Users, FileText, Brain, AlertTriangle, Activity, Video, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  totalUsers: number;
  activeUsers: number;
  recentAnalyses: number;
  highRiskAssessments: number;
  activeMeetings: number;
  aiChatSessions: number;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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

  const dashboardCards = [
    {
      title: "รายงานทั้งหมด",
      value: stats?.totalReports || 0,
      subvalue: `${stats?.pendingReports || 0} รอการอนุมัติ`,
      icon: FileText,
      href: "/admin/reports",
      color: "bg-blue-500"
    },
    {
      title: "ผู้ใช้งาน",
      value: stats?.totalUsers || 0,
      subvalue: `${stats?.activeUsers || 0} ใช้งานล่าสุด`,
      icon: Users,
      href: "/admin/users",
      color: "bg-green-500"
    },
    {
      title: "การวิเคราะห์ AI",
      value: stats?.recentAnalyses || 0,
      subvalue: "การวิเคราะห์ล่าสุด",
      icon: Brain,
      href: "/admin/ai-analysis",
      color: "bg-purple-500"
    },
    {
      title: "ประเมินความเสี่ยงสูง",
      value: stats?.highRiskAssessments || 0,
      subvalue: "ต้องติดตาม",
      icon: AlertTriangle,
      href: "/admin/risk-assessment",
      color: "bg-red-500"
    },
    {
      title: "การรักษาทางไกล",
      value: stats?.activeMeetings || 0,
      subvalue: "ห้องประชุมที่ใช้งาน",
      icon: Video,
      href: "/admin/telemedicine",
      color: "bg-indigo-500"
    },
    {
      title: "AI Chat Sessions",
      value: stats?.aiChatSessions || 0,
      subvalue: "การปรึกษาล่าสุด",
      icon: MessageSquare,
      href: "/admin/ai-chat-history",
      color: "bg-teal-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">แดชบอร์ดผู้ดูแลระบบ</h1>
        <p className="text-gray-600 mt-2">
          ภาพรวมของระบบ Green Epidemic
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card, index) => (
          <Link key={index} href={card.href}>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-gray-300 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.subvalue}</p>
                </div>
                <div className={`p-3 rounded-full ${card.color}`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">การดำเนินการด่วน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/reports">
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-medium">ตรวจสอบรายงาน</span>
              </div>
            </button>
          </Link>
          
          <Link href="/admin/ai-analysis">
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <Brain className="w-5 h-5 text-purple-500" />
                <span className="font-medium">สร้างการวิเคราะห์ AI</span>
              </div>
            </button>
          </Link>
          
          <Link href="/admin/bulk-health-stats">
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <span className="font-medium">นำเข้าข้อมูลสุขภาพ</span>
              </div>
            </button>
          </Link>
          
          <Link href="/admin/users">
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-indigo-500" />
                <span className="font-medium">จัดการผู้ใช้</span>
              </div>
            </button>
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">สถานะระบบ</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">API การวิเคราะห์ AI</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              ออนไลน์
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">ฐานข้อมูล</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              ออนไลน์
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">การแจ้งเตือน</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              ใช้งานได้
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Cloudflare Calls</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              ใช้งานได้
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
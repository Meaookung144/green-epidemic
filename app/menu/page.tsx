'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Home, 
  Map, 
  FileText, 
  BarChart3, 
  Settings, 
  User, 
  Shield,
  MessageSquare,
  Heart,
  Activity,
  Cloud,
  Users,
  Bell,
  HelpCircle,
  Info,
  Lock,
  ChevronRight,
  Flame
} from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  category: 'main' | 'tools' | 'admin' | 'account' | 'support';
}

const menuItems: MenuItem[] = [
  // Main Features
  { 
    href: '/dashboard', 
    label: 'Dashboard', 
    description: 'Overview of your health and environmental data',
    icon: Home, 
    category: 'main' 
  },
  { 
    href: '/map', 
    label: 'Environmental Map', 
    description: 'View air quality and weather conditions',
    icon: Map, 
    category: 'main' 
  },
  { 
    href: '/reports', 
    label: 'Health Reports', 
    description: 'Submit and view health incident reports',
    icon: FileText, 
    category: 'main' 
  },
  { 
    href: '/ai-health-chat', 
    label: 'AI Health Assistant', 
    description: 'Chat with AI for health advice and analysis',
    icon: MessageSquare, 
    category: 'main' 
  },

  // Tools
  { 
    href: '/health-status', 
    label: 'Health Status', 
    description: 'Track your personal health metrics',
    icon: Heart, 
    category: 'tools' 
  },
  { 
    href: '/weather', 
    label: 'Weather Data', 
    description: 'Detailed weather and air quality information',
    icon: Cloud, 
    category: 'tools' 
  },
  { 
    href: '/analytics', 
    label: 'Analytics', 
    description: 'View trends and statistical analysis',
    icon: BarChart3, 
    category: 'tools' 
  },
  { 
    href: '/surveillance', 
    label: 'Surveillance Points', 
    description: 'Manage your monitoring locations',
    icon: Activity, 
    category: 'tools' 
  },

  // Admin
  { 
    href: '/admin', 
    label: 'Admin Dashboard', 
    description: 'System administration and management',
    icon: Shield, 
    category: 'admin',
    adminOnly: true 
  },
  { 
    href: '/admin/users', 
    label: 'User Management', 
    description: 'Manage user accounts and permissions',
    icon: Users, 
    category: 'admin',
    adminOnly: true 
  },
  { 
    href: '/admin/reports', 
    label: 'Report Management', 
    description: 'Review and moderate user reports',
    icon: FileText, 
    category: 'admin',
    adminOnly: true 
  },
  { 
    href: '/admin/hotspots', 
    label: 'Hotspot Management', 
    description: 'Manage NASA FIRMS fire hotspot data',
    icon: Flame, 
    category: 'admin',
    adminOnly: true 
  },

  // Account
  { 
    href: '/profile', 
    label: 'Profile Settings', 
    description: 'Manage your account and preferences',
    icon: User, 
    category: 'account' 
  },
  { 
    href: '/notifications', 
    label: 'Notifications', 
    description: 'Configure alert and notification settings',
    icon: Bell, 
    category: 'account' 
  },
  { 
    href: '/settings', 
    label: 'App Settings', 
    description: 'Customize app behavior and appearance',
    icon: Settings, 
    category: 'account' 
  },
  { 
    href: '/privacy', 
    label: 'Privacy & Security', 
    description: 'Manage data privacy and security settings',
    icon: Lock, 
    category: 'account' 
  },

  // Support
  { 
    href: '/help', 
    label: 'Help & Support', 
    description: 'Get help and view documentation',
    icon: HelpCircle, 
    category: 'support' 
  },
  { 
    href: '/about', 
    label: 'About', 
    description: 'Learn more about Green Epidemic',
    icon: Info, 
    category: 'support' 
  },
];

const categoryLabels = {
  main: 'Main Features',
  tools: 'Tools & Analytics',
  admin: 'Administration',
  account: 'Account & Settings',
  support: 'Help & Support'
};

export default function MenuPage() {
  const { data: session } = useSession();

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const groupedItems = menuItems.reduce((acc, item) => {
    if (item.adminOnly && !isAdmin) return acc;
    
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu</h1>
          <p className="text-gray-600">Access all features and settings of Green Epidemic</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {session?.user?.name || 'User'}
              </h2>
              <p className="text-gray-500">{session?.user?.email}</p>
              {isAdmin && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                  Administrator
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h2>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {items.map((item, index) => {
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                        index !== items.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{item.label}</h3>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* App Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Green Epidemic v1.0</p>
          <p>Environmental & Health Monitoring System</p>
        </div>
      </div>
    </div>
  );
}
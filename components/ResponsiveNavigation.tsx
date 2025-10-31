'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Home, 
  Map, 
  FileText, 
  BarChart3, 
  Settings, 
  User, 
  Menu,
  X,
  Shield,
  MessageSquare,
  Heart,
  LogOut
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/ai-health-chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
  { href: '/menu', label: 'Menu', icon: Menu },
];

export default function ResponsiveNavigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);
  
  // Debug logging
  console.log('Navigation Debug:', {
    sessionExists: !!session,
    userId: session?.user?.id,
    userRole: (session?.user as any)?.role,
    isAdmin,
    userName: session?.user?.name
  });

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <>
      {/* Desktop Navigation - Top Bar */}
      <nav className="hidden lg:block bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-3 flex-shrink-0">
              <img 
                src="/logo.svg" 
                alt="Green Epidemic Logo" 
                className="w-10 h-10"
              />
              <span className="font-bold text-xl text-gray-900 hidden xl:block">Green Epidemic</span>
              <span className="font-bold text-lg text-gray-900 xl:hidden">GE</span>
            </Link>

            {/* Desktop Navigation Items */}
            <div className="flex items-center space-x-1 xl:space-x-3">
              {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-green-700 bg-green-100 shadow-sm'
                        : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Link>
                );
              })}
              
              {/* User Menu */}
              <div className="flex items-center space-x-3 ml-6 border-l border-gray-200 pl-6">
                <div className="hidden xl:block text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {session?.user?.name || session?.user?.email}
                  </div>
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-500">
                      Role: {(session?.user as any)?.role || 'Unknown'}
                    </div>
                  )}
                </div>
                
                {/* User Avatar/Initial */}
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                
                {/* Temporary fix for role refresh */}
                {(session?.user as any)?.role !== 'ADMIN' && process.env.NODE_ENV === 'development' && (
                  <div className="absolute top-16 right-6 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg shadow-lg text-xs">
                    Role not synced? 
                    <button
                      onClick={handleSignOut}
                      className="ml-1 underline hover:no-underline font-medium"
                    >
                      Sign out & back in
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-4 py-3 font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden xl:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Tablet/Mobile Navigation - Top Bar with Menu Toggle */}
      <nav className="lg:hidden bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-3 flex-shrink-0">
              <img 
                src="/logo.svg" 
                alt="Green Epidemic Logo" 
                className="w-9 h-9"
              />
              <span className="font-bold text-lg text-gray-900">Green Epidemic</span>
            </Link>

            {/* Menu Toggle and User Info */}
            <div className="flex items-center space-x-3">
              {/* User Avatar for tablet */}
              <div className="hidden md:flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {session?.user?.name?.split(' ')[0] || 'User'}
                </span>
              </div>
              
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-40">
            <div className="px-4 sm:px-6 py-4 space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-4 px-4 py-4 rounded-xl text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-green-700 bg-green-100 shadow-sm'
                        : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              <div className="border-t border-gray-200 mt-6 pt-4">
                <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {session?.user?.name || session?.user?.email}
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-500">
                        Role: {(session?.user as any)?.role || 'Unknown'}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-4 px-4 py-4 w-full text-left rounded-xl text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="h-6 w-6" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="grid grid-cols-5 h-20 px-2">
          {filteredNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 py-2 px-1 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="h-16 lg:h-20"></div> {/* Top navigation spacer */}
      <div className="sm:hidden h-20"></div> {/* Bottom navigation spacer for mobile */}
    </>
  );
}
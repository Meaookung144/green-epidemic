'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Mail, MapPin, Calendar, Settings, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    location: ''
  });

  useEffect(() => {
    if (session?.user) {
      setProfile({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '',
        address: '',
        dateOfBirth: '',
        location: ''
      });
    }
  }, [session]);

  const handleSave = async () => {
    try {
      // API call to update profile would go here
      console.log('Saving profile:', profile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your account information and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-gray-600" />
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{profile.name || 'User'}</h2>
              <p className="text-green-100">{profile.email}</p>
              {session?.user?.role === 'ADMIN' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Administrator
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-600 border border-green-300 rounded-md hover:bg-green-50"
            >
              <Settings className="h-4 w-4" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              ) : (
                <div className="flex items-center space-x-2 text-gray-900">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{profile.name || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center space-x-2 text-gray-900">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{profile.email}</span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="text-gray-900">
                  {profile.phone || 'Not set'}
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              ) : (
                <div className="flex items-center space-x-2 text-gray-900">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{profile.dateOfBirth || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              {isEditing ? (
                <textarea
                  value={profile.address}
                  onChange={(e) => setProfile({...profile, address: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your address"
                />
              ) : (
                <div className="flex items-start space-x-2 text-gray-900">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>{profile.address || 'Not set'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Notifications</h4>
              <p className="text-sm text-gray-500">Manage email and push notifications</p>
            </div>
            <button className="text-green-600 hover:text-green-700 font-medium">
              Configure
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Privacy Settings</h4>
              <p className="text-sm text-gray-500">Control your data and privacy preferences</p>
            </div>
            <button className="text-green-600 hover:text-green-700 font-medium">
              Manage
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Connected Accounts</h4>
              <p className="text-sm text-gray-500">Link external accounts and services</p>
            </div>
            <button className="text-green-600 hover:text-green-700 font-medium">
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/lib/services/weatherService';
import { prisma } from '@/lib/prisma';

// This API route can be called by a cron job service (like Vercel Cron or external service)
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (you should add proper auth)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all unique locations from surveillance points and home locations
    const surveillancePoints = await prisma.surveillancePoint.findMany({
      where: { active: true },
      select: {
        latitude: true,
        longitude: true,
      },
    });

    const users = await prisma.user.findMany({
      where: {
        homeLatitude: { not: null },
        homeLongitude: { not: null },
      },
      select: {
        homeLatitude: true,
        homeLongitude: true,
      },
    });

    // Combine and deduplicate locations
    const locations = new Map<string, { latitude: number; longitude: number }>();
    
    surveillancePoints.forEach(point => {
      const key = `${point.latitude.toFixed(2)},${point.longitude.toFixed(2)}`;
      locations.set(key, { latitude: point.latitude, longitude: point.longitude });
    });

    users.forEach(user => {
      if (user.homeLatitude && user.homeLongitude) {
        const key = `${user.homeLatitude.toFixed(2)},${user.homeLongitude.toFixed(2)}`;
        locations.set(key, { latitude: user.homeLatitude, longitude: user.homeLongitude });
      }
    });

    // Fetch weather data for all unique locations
    const locationArray = Array.from(locations.values());
    const results = await weatherService.fetchMultipleLocations(locationArray);

    // Clean old data (keep 30 days)
    await weatherService.cleanOldData(30);

    return NextResponse.json({
      success: true,
      locationsProcessed: locationArray.length,
      results: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron weather fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to process weather cron job' },
      { status: 500 }
    );
  }
}

// Manual trigger for testing
export async function POST(request: NextRequest) {
  // Add a default location for testing when no users/surveillance points exist
  const defaultLocations = [
    { latitude: 13.7563, longitude: 100.5018 }, // Bangkok
    { latitude: 18.7883, longitude: 98.9853 },  // Chiang Mai
    { latitude: 7.8804, longitude: 98.3923 },   // Phuket
  ];

  try {
    const results = await weatherService.fetchMultipleLocations(defaultLocations);
    
    return NextResponse.json({
      success: true,
      message: 'Manual weather fetch completed',
      results: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Manual weather fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
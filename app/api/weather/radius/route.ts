import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const showAll = searchParams.get('showAll') === 'true';
    
    if (showAll) {
      // Show all existing data from database
      const allWeatherData = await prisma.weatherData.findMany({
        orderBy: {
          recordedAt: 'desc',
        },
        take: 1000, // Limit to prevent too much data
      });

      // Group by location (get latest reading for each unique location)
      const groupedData = new Map();
      allWeatherData.forEach(item => {
        const key = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
        if (!groupedData.has(key) || new Date(item.recordedAt) > new Date(groupedData.get(key).recordedAt)) {
          groupedData.set(key, item);
        }
      });

      const result = Array.from(groupedData.values());

      return NextResponse.json({
        data: result,
        count: result.length,
        totalRecords: allWeatherData.length,
        message: `Showing all ${result.length} weather stations from database`,
        showAll: true
      });
    }

    // Original radius-based filtering
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '100'); // Default 100km radius

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Calculate bounding box for efficient database query
    // 1 degree of latitude ≈ 111 km
    // 1 degree of longitude ≈ 111 km * cos(latitude)
    const latDelta = radius / 111; // degrees
    const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180)); // degrees

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    // Get weather data within the bounding box
    const weatherData = await prisma.weatherData.findMany({
      where: {
        latitude: {
          gte: minLat,
          lte: maxLat,
        },
        longitude: {
          gte: minLng,
          lte: maxLng,
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: 50, // Limit results
    });

    // Filter by exact radius using Haversine formula
    const filteredData = weatherData.filter(item => {
      const distance = calculateDistance(lat, lng, item.latitude, item.longitude);
      return distance <= radius;
    });

    // Group by location (combine multiple readings from same location)
    const groupedData = new Map();
    filteredData.forEach(item => {
      const key = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
      if (!groupedData.has(key) || new Date(item.recordedAt) > new Date(groupedData.get(key).recordedAt)) {
        groupedData.set(key, item);
      }
    });

    const result = Array.from(groupedData.values());

    return NextResponse.json({
      data: result,
      count: result.length,
      radius,
      center: { lat, lng },
      message: result.length > 0 ? 
        `Found ${result.length} weather stations within ${radius}km` :
        `No weather data found within ${radius}km radius`
    });

  } catch (error) {
    console.error('Weather radius API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
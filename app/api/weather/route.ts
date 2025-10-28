import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/lib/services/weatherService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // First, try to get recent data from database
    let data = await weatherService.getLatestData(lat, lon);
    
    // If no recent data or force refresh requested, fetch from APIs
    if (!data || forceRefresh || await weatherService.shouldFetchData(lat, lon)) {
      console.log(`Fetching fresh weather data for ${lat}, ${lon}`);
      data = await weatherService.fetchWeatherData(lat, lon);
    } else {
      console.log(`Serving cached weather data for ${lat}, ${lon}`);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locations } = body;

    if (!locations || !Array.isArray(locations)) {
      return NextResponse.json(
        { error: 'Locations array is required' },
        { status: 400 }
      );
    }

    const results = await weatherService.fetchMultipleLocations(locations);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Weather batch API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
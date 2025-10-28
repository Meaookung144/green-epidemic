import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/lib/services/weatherService';

// Major Thai cities and locations for regular data fetching
const THAI_LOCATIONS = [
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018 },
  { name: 'Chiang Mai', latitude: 18.7883, longitude: 98.9853 },
  { name: 'Phuket', latitude: 7.8804, longitude: 98.3923 },
  { name: 'Pattaya', latitude: 12.9236, longitude: 100.8825 },
  { name: 'Khon Kaen', latitude: 16.4322, longitude: 102.8236 },
  { name: 'Hat Yai', latitude: 7.0103, longitude: 100.4925 },
  { name: 'Nakhon Ratchasima', latitude: 14.9799, longitude: 102.0977 },
  { name: 'Udon Thani', latitude: 17.4138, longitude: 102.7867 },
  { name: 'Surat Thani', latitude: 9.1382, longitude: 99.3215 },
  { name: 'Chon Buri', latitude: 13.3611, longitude: 100.9847 },
  { name: 'Rayong', latitude: 12.6806, longitude: 101.2561 },
  { name: 'Krabi', latitude: 8.0863, longitude: 98.9063 },
];

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting weather data sync for Thai locations...');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Fetch data for each major location
    for (const location of THAI_LOCATIONS) {
      try {
        console.log(`Fetching data for ${location.name}...`);
        
        // Check if we need to fetch fresh data (respects 1-hour cache)
        if (await weatherService.shouldFetchData(location.latitude, location.longitude)) {
          const data = await weatherService.fetchWeatherData(location.latitude, location.longitude);
          results.push({
            location: location.name,
            status: 'success',
            data: {
              pm25: data?.pm25,
              aqi: data?.aqi,
              airQualitySource: data?.airQualitySource,
              temperature: data?.temperature,
              humidity: data?.humidity
            }
          });
          successCount++;
          console.log(`✓ Successfully fetched data for ${location.name}`);
        } else {
          results.push({
            location: location.name,
            status: 'skipped',
            reason: 'Recent data available (within 1 hour)'
          });
          console.log(`⏭ Skipped ${location.name} - recent data available`);
        }
        
        // Add a small delay between requests to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`✗ Error fetching data for ${location.name}:`, error);
        results.push({
          location: location.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    // Clean up old data (older than 7 days)
    try {
      const deletedCount = await weatherService.cleanOldData(7);
      console.log(`Cleaned up ${deletedCount} old weather records`);
    } catch (error) {
      console.error('Error cleaning old data:', error);
    }

    const summary = {
      totalLocations: THAI_LOCATIONS.length,
      successCount,
      errorCount,
      skippedCount: THAI_LOCATIONS.length - successCount - errorCount,
      timestamp: new Date().toISOString()
    };

    console.log('Weather sync completed:', summary);

    return NextResponse.json({
      success: true,
      summary,
      results
    });

  } catch (error) {
    console.error('Weather sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync weather data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow manual trigger via GET request for testing
  return POST(request);
}
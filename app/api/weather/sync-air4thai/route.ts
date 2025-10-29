import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

interface Air4ThaiStation {
  stationID: string;
  nameTH: string;
  nameEN: string;
  areaTH: string;
  areaEN: string;
  lat: string;
  long: string;
  stationType?: string;
  AQILast: {
    date: string;
    time: string;
    PM25: {
      color_id: string;
      aqi: string;
      value: string;
    };
    PM10: {
      color_id: string;
      aqi: string;
      value: string;
    };
    O3?: {
      color_id: string;
      aqi: string;
      value: string;
    };
    CO?: {
      color_id: string;
      aqi: string;
      value: string;
    };
    NO2?: {
      color_id: string;
      aqi: string;
      value: string;
    };
    SO2?: {
      color_id: string;
      aqi: string;
      value: string;
    };
    AQI: {
      color_id: string;
      aqi: string;
      param: string;
    };
  };
}

interface Air4ThaiResponse {
  stations: Air4ThaiStation[];
}

// POST /api/weather/sync-air4thai - Sync all Air4Thai station data
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

    console.log('Starting Air4Thai bulk data sync...');
    
    // Fetch all Air4Thai station data
    const response = await axios.get<Air4ThaiResponse>(
      'http://air4thai.com/forweb/getAQI_JSON.php',
      { timeout: 15000 }
    );

    if (!response.data.stations || response.data.stations.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No stations found in Air4Thai response',
        timestamp: new Date().toISOString()
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let savedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const savedStations: string[] = [];
    const errors: Array<{ station: string; error: string }> = [];

    // Process all stations
    for (const station of response.data.stations) {
      try {
        const stationLat = parseFloat(station.lat);
        const stationLng = parseFloat(station.long);
        
        if (isNaN(stationLat) || isNaN(stationLng)) {
          console.warn(`Invalid coordinates for station ${station.stationID}: ${station.lat}, ${station.long}`);
          errorCount++;
          errors.push({ 
            station: station.stationID, 
            error: 'Invalid coordinates' 
          });
          continue;
        }

        if (!station.AQILast) {
          console.warn(`No AQI data for station ${station.stationID}`);
          errorCount++;
          errors.push({ 
            station: station.stationID, 
            error: 'No AQI data' 
          });
          continue;
        }

        // Check if we already have recent data for this station
        const existingData = await prisma.weatherData.findFirst({
          where: {
            latitude: {
              gte: stationLat - 0.001,
              lte: stationLat + 0.001,
            },
            longitude: {
              gte: stationLng - 0.001,
              lte: stationLng + 0.001,
            },
            recordedAt: {
              gte: oneHourAgo,
            },
            airQualitySource: 'Air4Thai'
          }
        });

        if (existingData) {
          skippedCount++;
          continue;
        }

        // Parse values
        const pm25Value = parseFloat(station.AQILast.PM25.value);
        const pm10Value = parseFloat(station.AQILast.PM10.value);
        const aqiValue = parseFloat(station.AQILast.AQI.aqi);

        // Create metadata JSON with additional station info
        const metadata = {
          stationID: station.stationID,
          nameEN: station.nameEN,
          nameTH: station.nameTH,
          areaEN: station.areaEN,
          areaTH: station.areaTH,
          stationType: station.stationType || 'UNKNOWN',
          mainParameter: station.AQILast.AQI.param,
          colorCode: station.AQILast.AQI.color_id,
          additionalData: {
            O3: station.AQILast.O3 ? parseFloat(station.AQILast.O3.value) : null,
            CO: station.AQILast.CO ? parseFloat(station.AQILast.CO.value) : null,
            NO2: station.AQILast.NO2 ? parseFloat(station.AQILast.NO2.value) : null,
            SO2: station.AQILast.SO2 ? parseFloat(station.AQILast.SO2.value) : null,
          }
        };

        // Save to database
        await prisma.weatherData.create({
          data: {
            latitude: stationLat,
            longitude: stationLng,
            pm25: pm25Value >= 0 ? pm25Value : null,
            pm10: pm10Value >= 0 ? pm10Value : null,
            aqi: aqiValue >= 0 ? Math.round(aqiValue) : null,
            temperature: null,
            humidity: null,
            windSpeed: null,
            windDirection: null,
            source: `Air4Thai-${station.stationID}`,
            airQualitySource: 'Air4Thai',
            stationName: station.nameEN,
            stationId: station.stationID,
            recordedAt: new Date(`${station.AQILast.date} ${station.AQILast.time}`),
          }
        });
        
        savedCount++;
        savedStations.push(`${station.nameEN} (${station.stationID})`);
        
      } catch (saveError) {
        console.error(`Error saving station ${station.stationID}:`, saveError);
        errorCount++;
        errors.push({ 
          station: station.stationID, 
          error: saveError instanceof Error ? saveError.message : 'Unknown error' 
        });
      }
    }

    // Clean up old Air4Thai data (older than 7 days)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const deletedCount = await prisma.weatherData.deleteMany({
        where: {
          airQualitySource: 'Air4Thai',
          createdAt: {
            lt: sevenDaysAgo
          }
        }
      });
      console.log(`Cleaned up ${deletedCount.count} old Air4Thai records`);
    } catch (cleanupError) {
      console.error('Error cleaning old data:', cleanupError);
    }

    const summary = {
      totalStations: response.data.stations.length,
      savedCount,
      skippedCount,
      errorCount,
      timestamp: new Date().toISOString()
    };

    console.log(`✓ Air4Thai sync complete: ${savedCount} saved, ${skippedCount} skipped, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      summary,
      savedStations: savedStations.slice(0, 10), // Return first 10 for brevity
      errors: errors.slice(0, 5), // Return first 5 errors
      message: `Successfully synced ${savedCount} Air4Thai stations`
    });

  } catch (error) {
    console.error('Air4Thai sync error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync Air4Thai data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET /api/weather/sync-air4thai - Get sync status
export async function GET(request: NextRequest) {
  try {
    // Count Air4Thai data in database
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [totalCount, recentCount, dailyCount] = await Promise.all([
      prisma.weatherData.count({
        where: {
          airQualitySource: 'Air4Thai'
        }
      }),
      prisma.weatherData.count({
        where: {
          airQualitySource: 'Air4Thai',
          recordedAt: {
            gte: oneHourAgo
          }
        }
      }),
      prisma.weatherData.count({
        where: {
          airQualitySource: 'Air4Thai',
          recordedAt: {
            gte: oneDayAgo
          }
        }
      })
    ]);

    // Get latest Air4Thai record
    const latestRecord = await prisma.weatherData.findFirst({
      where: {
        airQualitySource: 'Air4Thai'
      },
      orderBy: {
        recordedAt: 'desc'
      }
    });

    return NextResponse.json({
      status: {
        totalRecords: totalCount,
        recentRecords: recentCount,
        dailyRecords: dailyCount,
        lastUpdate: latestRecord?.recordedAt || null,
        needsSync: recentCount === 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Air4Thai status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Air4Thai sync status' },
      { status: 500 }
    );
  }
}
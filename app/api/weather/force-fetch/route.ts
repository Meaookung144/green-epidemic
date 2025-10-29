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

// POST /api/weather/force-fetch - Manual force fetch for users
export async function POST(request: NextRequest) {
  try {
    console.log('Starting manual Air4Thai force fetch...');
    
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

    let savedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const savedStations: string[] = [];
    const errors: Array<{ station: string; error: string }> = [];

    // Process all stations (no hourly check for manual force fetch)
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

        // Parse values
        const pm25Value = parseFloat(station.AQILast.PM25.value);
        const pm10Value = parseFloat(station.AQILast.PM10.value);
        const aqiValue = parseFloat(station.AQILast.AQI.aqi);

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
            source: `Air4Thai-${station.stationID}-manual`,
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

    const summary = {
      totalStations: response.data.stations.length,
      savedCount,
      skippedCount,
      errorCount,
      timestamp: new Date().toISOString()
    };

    console.log(`✓ Manual Air4Thai force fetch complete: ${savedCount} saved, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      summary,
      savedStations: savedStations.slice(0, 10), // Return first 10 for brevity
      errors: errors.slice(0, 5), // Return first 5 errors
      message: `Successfully force fetched ${savedCount} Air4Thai stations`
    });

  } catch (error) {
    console.error('Manual Air4Thai force fetch error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to force fetch Air4Thai data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
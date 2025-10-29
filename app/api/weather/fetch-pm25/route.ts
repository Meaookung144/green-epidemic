import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

interface AirQualityResponse {
  data: {
    aqi: number;
    iaqi: {
      pm25?: { v: number };
      pm10?: { v: number };
    };
  };
}

interface Air4ThaiStation {
  stationID: string;
  nameTH: string;
  nameEN: string;
  areaTH: string;
  areaEN: string;
  lat: string;
  long: string;
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

// POST /api/weather/fetch-pm25 - Manual fetch for PM2.5/air quality data only
export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, source = 'both' } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    console.log(`Manually fetching PM2.5 data for ${latitude}, ${longitude} from ${source}...`);

    const aqicnApiKey = process.env.AQICN_API_KEY;
    const airQualitySources = [];

    // Source 1: AQICN (if requested or both)
    if ((source === 'aqicn' || source === 'both') && aqicnApiKey && aqicnApiKey !== 'your-aqicn-api-key') {
      try {
        const aqiResponse = await axios.get<AirQualityResponse>(
          `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${aqicnApiKey}`,
          { timeout: 10000 }
        );
        
        if (aqiResponse.data.data) {
          airQualitySources.push({
            source: 'AQICN',
            aqi: aqiResponse.data.data.aqi,
            pm25: aqiResponse.data.data.iaqi.pm25?.v,
            pm10: aqiResponse.data.data.iaqi.pm10?.v,
            reliability: 0.8
          });
          console.log('Successfully fetched AQICN data');
        }
      } catch (error) {
        console.error('Error fetching AQICN data:', error);
      }
    }

    // Source 2: Air4Thai (if requested or both)
    if (source === 'air4thai' || source === 'both') {
      try {
        const air4thaiData = await fetchAir4ThaiData(parseFloat(latitude), parseFloat(longitude));
        if (air4thaiData) {
          airQualitySources.push({
            source: 'Air4Thai',
            aqi: air4thaiData.aqi,
            pm25: air4thaiData.pm25,
            pm10: air4thaiData.pm10,
            reliability: air4thaiData.distance <= 10 ? 0.9 : 0.7,
            stationName: air4thaiData.stationName,
            stationId: air4thaiData.stationId,
            distance: air4thaiData.distance
          });
          console.log('Successfully fetched Air4Thai data');
        }
      } catch (error) {
        console.error('Error fetching Air4Thai data:', error);
      }
    }

    if (airQualitySources.length === 0) {
      return NextResponse.json(
        { error: 'No air quality data sources available or configured' },
        { status: 500 }
      );
    }

    // Select best data source (prioritize by reliability and data completeness)
    const sourcesWithPM25 = airQualitySources.filter(source => source.pm25 !== null && source.pm25 !== undefined);
    
    let bestSource;
    if (sourcesWithPM25.length > 0) {
      bestSource = sourcesWithPM25.sort((a, b) => {
        const aScore = a.reliability + (a.pm25 ? 0.2 : 0) + (a.pm10 ? 0.1 : 0);
        const bScore = b.reliability + (b.pm25 ? 0.2 : 0) + (b.pm10 ? 0.1 : 0);
        return bScore - aScore;
      })[0];
    } else {
      bestSource = airQualitySources[0];
    }

    // Save to database
    const savedData = await prisma.weatherData.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        temperature: null,
        humidity: null,
        windSpeed: null,
        windDirection: null,
        pm25: bestSource.pm25,
        pm10: bestSource.pm10,
        aqi: bestSource.aqi,
        source: `Manual-${bestSource.source}`,
        airQualitySource: bestSource.source,
        stationName: bestSource.stationName || null,
        stationId: bestSource.stationId || null,
        recordedAt: new Date(),
      },
    });

    console.log(`✓ PM2.5 data saved for ${latitude}, ${longitude} from ${bestSource.source}`);

    return NextResponse.json({
      success: true,
      data: savedData,
      message: `Successfully fetched PM2.5 data for coordinates ${latitude}, ${longitude}`,
      source: bestSource.source,
      stationName: bestSource.stationName,
      distance: bestSource.distance,
      availableSources: airQualitySources.map(s => s.source),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual PM2.5 fetch error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch PM2.5 data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two points
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

// Helper function to fetch Air4Thai data
async function fetchAir4ThaiData(latitude: number, longitude: number) {
  try {
    const response = await axios.get<Air4ThaiResponse>(
      'http://air4thai.com/forweb/getAQI_JSON.php',
      { timeout: 10000 }
    );

    if (!response.data.stations || response.data.stations.length === 0) {
      return null;
    }

    // Find the nearest station for the requested location
    let nearestStation: Air4ThaiStation | null = null;
    let minDistance = Infinity;

    for (const station of response.data.stations) {
      const stationLat = parseFloat(station.lat);
      const stationLng = parseFloat(station.long);
      
      if (isNaN(stationLat) || isNaN(stationLng)) continue;

      const distance = calculateDistance(latitude, longitude, stationLat, stationLng);
      
      if (distance < minDistance && distance <= 100) { // Within 100km
        minDistance = distance;
        nearestStation = station;
      }
    }

    if (!nearestStation || !nearestStation.AQILast) {
      return null;
    }

    const pm25Value = parseFloat(nearestStation.AQILast.PM25.value);
    const pm10Value = parseFloat(nearestStation.AQILast.PM10.value);
    const aqiValue = parseFloat(nearestStation.AQILast.AQI.aqi);

    return {
      pm25: pm25Value >= 0 ? pm25Value : null,
      pm10: pm10Value >= 0 ? pm10Value : null,
      aqi: aqiValue >= 0 ? aqiValue : null,
      source: 'Air4Thai',
      stationName: nearestStation.nameEN,
      stationId: nearestStation.stationID,
      distance: minDistance,
      lastUpdate: `${nearestStation.AQILast.date} ${nearestStation.AQILast.time}`
    };
  } catch (error) {
    console.error('Error fetching Air4Thai data:', error);
    return null;
  }
}
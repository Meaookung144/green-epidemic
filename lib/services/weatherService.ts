import axios from 'axios';
import { prisma } from '@/lib/prisma';

interface WeatherAPIResponse {
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
}

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

export class WeatherService {
  private openWeatherApiKey: string;
  private aqicnApiKey: string;

  constructor() {
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY || '';
    this.aqicnApiKey = process.env.AQICN_API_KEY || '';
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private async fetchAir4ThaiData(latitude: number, longitude: number) {
    try {
      const response = await axios.get<Air4ThaiResponse>(
        'http://air4thai.com/forweb/getAQI_JSON.php',
        { timeout: 10000 }
      );

      if (!response.data.stations || response.data.stations.length === 0) {
        return null;
      }

      // Find the nearest station within 50km
      let nearestStation: Air4ThaiStation | null = null;
      let minDistance = Infinity;

      for (const station of response.data.stations) {
        const stationLat = parseFloat(station.lat);
        const stationLng = parseFloat(station.long);
        
        if (isNaN(stationLat) || isNaN(stationLng)) continue;

        const distance = this.calculateDistance(latitude, longitude, stationLat, stationLng);
        
        if (distance < minDistance && distance <= 50) { // Within 50km
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
        distance: minDistance,
        lastUpdate: `${nearestStation.AQILast.date} ${nearestStation.AQILast.time}`
      };
    } catch (error) {
      console.error('Error fetching Air4Thai data:', error);
      return null;
    }
  }

  async shouldFetchData(latitude: number, longitude: number): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentData = await prisma.weatherData.findFirst({
      where: {
        latitude: {
          gte: latitude - 0.01,
          lte: latitude + 0.01,
        },
        longitude: {
          gte: longitude - 0.01,
          lte: longitude + 0.01,
        },
        recordedAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });

    return !recentData;
  }

  async fetchWeatherData(latitude: number, longitude: number) {
    try {
      if (!await this.shouldFetchData(latitude, longitude)) {
        console.log(`Weather data for ${latitude}, ${longitude} is still fresh. Skipping fetch.`);
        return await this.getLatestData(latitude, longitude);
      }

      let weatherData: any = {};
      
      // Fetch weather data from OpenWeatherMap (if API key is properly configured)
      if (this.openWeatherApiKey && this.openWeatherApiKey !== 'your-openweather-api-key') {
        try {
          const weatherResponse = await axios.get<WeatherAPIResponse>(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${this.openWeatherApiKey}&units=metric`
          );
          
          weatherData.temperature = weatherResponse.data.main.temp;
          weatherData.humidity = weatherResponse.data.main.humidity;
          weatherData.windSpeed = weatherResponse.data.wind.speed;
          weatherData.windDirection = weatherResponse.data.wind.deg;
          console.log('Successfully fetched OpenWeatherMap data');
        } catch (error) {
          console.error('Error fetching OpenWeatherMap data:', error);
        }
      } else {
        console.log('OpenWeatherMap API key not configured, skipping weather data');
      }

      // Fetch air quality data from multiple sources
      const airQualitySources = [];

      // Source 1: AQICN
      if (this.aqicnApiKey && this.aqicnApiKey !== 'your-aqicn-api-key') {
        try {
          const aqiResponse = await axios.get<AirQualityResponse>(
            `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${this.aqicnApiKey}`
          );
          
          if (aqiResponse.data.data) {
            airQualitySources.push({
              source: 'AQICN',
              aqi: aqiResponse.data.data.aqi,
              pm25: aqiResponse.data.data.iaqi.pm25?.v,
              pm10: aqiResponse.data.data.iaqi.pm10?.v,
              reliability: 0.8 // AQICN reliability score
            });
            console.log('Successfully fetched AQICN data');
          }
        } catch (error) {
          console.error('Error fetching AQICN data:', error);
        }
      } else {
        console.log('AQICN API key not configured, skipping AQICN data');
      }

      // Source 2: Air4Thai
      try {
        const air4thaiData = await this.fetchAir4ThaiData(latitude, longitude);
        if (air4thaiData) {
          airQualitySources.push({
            source: 'Air4Thai',
            aqi: air4thaiData.aqi,
            pm25: air4thaiData.pm25,
            pm10: air4thaiData.pm10,
            reliability: air4thaiData.distance <= 10 ? 0.9 : 0.7, // Higher reliability for closer stations
            stationName: air4thaiData.stationName,
            distance: air4thaiData.distance
          });
        }
      } catch (error) {
        console.error('Error fetching Air4Thai data:', error);
      }

      // Select best data source (prioritize by reliability and data completeness)
      if (airQualitySources.length > 0) {
        // Sort by reliability and data completeness
        const sourcesWithPM25 = airQualitySources.filter(source => source.pm25 !== null && source.pm25 !== undefined);
        
        if (sourcesWithPM25.length > 0) {
          const bestSource = sourcesWithPM25.sort((a, b) => {
            // Prefer sources with PM2.5 data
            const aScore = a.reliability + (a.pm25 ? 0.2 : 0) + (a.pm10 ? 0.1 : 0);
            const bScore = b.reliability + (b.pm25 ? 0.2 : 0) + (b.pm10 ? 0.1 : 0);
            return bScore - aScore;
          })[0];

          weatherData.aqi = bestSource.aqi;
          weatherData.pm25 = bestSource.pm25;
          weatherData.pm10 = bestSource.pm10;
          weatherData.airQualitySource = bestSource.source;
          
          // Log the selected source for debugging
          console.log(`Selected air quality source: ${bestSource.source} for location ${latitude}, ${longitude}`);
          if (bestSource.stationName) {
            console.log(`Station: ${bestSource.stationName}, Distance: ${bestSource.distance?.toFixed(2)}km`);
          }
        } else {
          // Use any available source even without PM2.5 data
          const fallbackSource = airQualitySources[0];
          weatherData.aqi = fallbackSource.aqi;
          weatherData.airQualitySource = fallbackSource.source;
          console.log(`Using fallback air quality source: ${fallbackSource.source} (no PM2.5 data)`);
        }
      } else {
        console.log('No air quality data sources available');
      }

      // Save to database
      const savedData = await prisma.weatherData.create({
        data: {
          latitude,
          longitude,
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          pm25: weatherData.pm25,
          pm10: weatherData.pm10,
          aqi: weatherData.aqi,
          windSpeed: weatherData.windSpeed,
          windDirection: weatherData.windDirection,
          source: 'API',
          airQualitySource: weatherData.airQualitySource || null,
          recordedAt: new Date(),
        },
      });

      return savedData;
    } catch (error) {
      console.error('Error in fetchWeatherData:', error);
      throw error;
    }
  }

  async getLatestData(latitude: number, longitude: number) {
    return await prisma.weatherData.findFirst({
      where: {
        latitude: {
          gte: latitude - 0.01,
          lte: latitude + 0.01,
        },
        longitude: {
          gte: longitude - 0.01,
          lte: longitude + 0.01,
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });
  }

  async fetchMultipleLocations(locations: Array<{ latitude: number; longitude: number }>) {
    const results = [];
    for (const location of locations) {
      try {
        const data = await this.fetchWeatherData(location.latitude, location.longitude);
        results.push(data);
      } catch (error) {
        console.error(`Error fetching data for ${location.latitude}, ${location.longitude}:`, error);
      }
    }
    return results;
  }

  async cleanOldData(daysToKeep: number = 30) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const deleted = await prisma.weatherData.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${deleted.count} old weather records`);
    return deleted.count;
  }
}

export const weatherService = new WeatherService();
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

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

// POST /api/weather/fetch-weather - Manual fetch for weather data only
export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;

    if (!openWeatherApiKey || openWeatherApiKey === 'your-openweather-api-key') {
      return NextResponse.json(
        { error: 'OpenWeatherMap API key not configured' },
        { status: 500 }
      );
    }

    console.log(`Manually fetching weather data for ${latitude}, ${longitude}...`);

    // Fetch weather data from OpenWeatherMap
    const weatherResponse = await axios.get<WeatherAPIResponse>(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}&units=metric`,
      { timeout: 10000 }
    );

    const weatherData = {
      temperature: weatherResponse.data.main.temp,
      humidity: weatherResponse.data.main.humidity,
      windSpeed: weatherResponse.data.wind.speed,
      windDirection: weatherResponse.data.wind.deg,
    };

    // Save to database
    const savedData = await prisma.weatherData.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        windDirection: weatherData.windDirection,
        pm25: null,
        pm10: null,
        aqi: null,
        source: 'Manual-OpenWeatherMap',
        airQualitySource: null,
        stationName: null,
        stationId: null,
        recordedAt: new Date(),
      },
    });

    console.log(`✓ Weather data saved for ${latitude}, ${longitude}`);

    return NextResponse.json({
      success: true,
      data: savedData,
      message: `Successfully fetched weather data for coordinates ${latitude}, ${longitude}`,
      source: 'OpenWeatherMap',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual weather fetch error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch weather data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/data/environmental - Get all environmental data points
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const source = searchParams.get('source'); // Filter by data source
    const hasWeather = searchParams.get('hasWeather') === 'true';
    const hasAirQuality = searchParams.get('hasAirQuality') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const whereClause: any = {};

    if (source) {
      whereClause.source = {
        contains: source,
        mode: 'insensitive'
      };
    }

    if (hasWeather) {
      whereClause.OR = [
        { temperature: { not: null } },
        { humidity: { not: null } },
        { windSpeed: { not: null } }
      ];
    }

    if (hasAirQuality) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { pm25: { not: null } },
        { pm10: { not: null } },
        { aqi: { not: null } }
      ];
    }

    if (startDate || endDate) {
      whereClause.recordedAt = {};
      if (startDate) {
        whereClause.recordedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.recordedAt.lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.weatherData.count({
      where: whereClause
    });

    // Fetch consolidated data - one point per coordinate showing most recent data
    const consolidate = searchParams.get('consolidate') === 'true';
    
    let weatherData;
    
    if (consolidate) {
      // Get unique coordinates first
      const uniqueCoordinates = await prisma.weatherData.groupBy({
        by: ['latitude', 'longitude'],
        where: whereClause,
        _count: {
          id: true
        },
        orderBy: [
          { latitude: 'asc' },
          { longitude: 'asc' }
        ]
      });

      // For each unique coordinate, get the most recent data point
      weatherData = [];
      for (const coord of uniqueCoordinates) {
        const latestData = await prisma.weatherData.findFirst({
          where: {
            ...whereClause,
            latitude: coord.latitude,
            longitude: coord.longitude
          },
          orderBy: {
            recordedAt: 'desc'
          },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            temperature: true,
            humidity: true,
            pm25: true,
            pm10: true,
            aqi: true,
            windSpeed: true,
            windDirection: true,
            source: true,
            airQualitySource: true,
            stationName: true,
            stationId: true,
            recordedAt: true,
            createdAt: true
          }
        });

        if (latestData) {
          weatherData.push({
            ...latestData,
            dataPointCount: coord._count.id,
            isConsolidated: true
          });
        }
      }

      // Apply pagination to consolidated results
      const paginatedData = weatherData.slice(offset, offset + limit);
      weatherData = paginatedData;
      
    } else {
      // Original behavior - fetch all data points
      weatherData = await prisma.weatherData.findMany({
        where: whereClause,
        orderBy: {
          recordedAt: 'desc'
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          latitude: true,
          longitude: true,
          temperature: true,
          humidity: true,
          pm25: true,
          pm10: true,
          aqi: true,
          windSpeed: true,
          windDirection: true,
          source: true,
          airQualitySource: true,
          stationName: true,
          stationId: true,
          recordedAt: true,
          createdAt: true
        }
      });

      // Add metadata for non-consolidated data
      weatherData = weatherData.map(item => ({
        ...item,
        dataPointCount: 1,
        isConsolidated: false
      }));
    }

    // Get summary statistics
    const stats = await prisma.weatherData.aggregate({
      where: whereClause,
      _count: {
        id: true
      },
      _avg: {
        temperature: true,
        humidity: true,
        pm25: true,
        pm10: true,
        aqi: true,
        windSpeed: true
      },
      _max: {
        pm25: true,
        aqi: true,
        temperature: true
      },
      _min: {
        pm25: true,
        aqi: true,
        temperature: true
      }
    });

    // Get data sources summary
    const sourceSummary = await prisma.weatherData.groupBy({
      by: ['source'],
      where: whereClause,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    const airQualitySourceSummary = await prisma.weatherData.groupBy({
      by: ['airQualitySource'],
      where: {
        ...whereClause,
        airQualitySource: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    return NextResponse.json({
      data: weatherData,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      statistics: {
        total: stats._count.id,
        averages: {
          temperature: stats._avg.temperature ? Number(stats._avg.temperature.toFixed(1)) : null,
          humidity: stats._avg.humidity ? Number(stats._avg.humidity.toFixed(1)) : null,
          pm25: stats._avg.pm25 ? Number(stats._avg.pm25.toFixed(1)) : null,
          pm10: stats._avg.pm10 ? Number(stats._avg.pm10.toFixed(1)) : null,
          aqi: stats._avg.aqi ? Number(stats._avg.aqi.toFixed(0)) : null,
          windSpeed: stats._avg.windSpeed ? Number(stats._avg.windSpeed.toFixed(1)) : null
        },
        ranges: {
          temperature: {
            min: stats._min.temperature ? Number(stats._min.temperature.toFixed(1)) : null,
            max: stats._max.temperature ? Number(stats._max.temperature.toFixed(1)) : null
          },
          pm25: {
            min: stats._min.pm25 ? Number(stats._min.pm25.toFixed(1)) : null,
            max: stats._max.pm25 ? Number(stats._max.pm25.toFixed(1)) : null
          },
          aqi: {
            min: stats._min.aqi ? Number(stats._min.aqi.toFixed(0)) : null,
            max: stats._max.aqi ? Number(stats._max.aqi.toFixed(0)) : null
          }
        }
      },
      sources: {
        dataSources: sourceSummary,
        airQualitySources: airQualitySourceSummary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Environmental data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environmental data' },
      { status: 500 }
    );
  }
}
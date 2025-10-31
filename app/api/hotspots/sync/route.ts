import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

interface FIRMSResponse {
  latitude: number;
  longitude: number;
  brightness: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: number;
  version: string;
  bright_t31: number;
  frp: number;
  daynight: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (optional - you might want to allow all users to trigger sync)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const apiKey = process.env.NASA_FIRMS_API_KEY;
    if (!apiKey || apiKey === 'your-nasa-firms-api-key-here') {
      return NextResponse.json(
        { error: 'NASA FIRMS API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      area = 'SEA', // Southeast Asia region by default
      days = 1,
      source = 'MODIS_NRT' // MODIS Near Real Time
    } = body;

    // Define area coordinates for known regions
    const areaCoordinates: Record<string, string> = {
      'SEA': '90,-15,155,30', // Southeast Asia: [west,south,east,north]
      'THAILAND': '97,5,106,21', // Thailand boundaries
      'VIETNAM': '102,8,110,24', // Vietnam boundaries
      'INDONESIA': '95,-11,141,6', // Indonesia boundaries
      'MALAYSIA': '99,1,120,8', // Malaysia boundaries
    };

    // Use coordinates if area is a known region, otherwise assume it's already coordinates
    const areaParam = areaCoordinates[area.toUpperCase()] || area;

    // NASA FIRMS API endpoint
    // For area-based data: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/{source}/{area}/{days}
    // Area format: west,south,east,north (longitude,latitude,longitude,latitude)
    
    const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${source}/${areaParam}/${days}`;
    
    console.log('Fetching FIRMS data from:', firmsUrl);

    const response = await fetch(firmsUrl, {
      headers: {
        'User-Agent': 'Green-Epidemic-Health-Monitor/1.0'
      }
    });

    if (!response.ok) {
      console.error('FIRMS API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `FIRMS API error: ${response.status}` },
        { status: 500 }
      );
    }

    const csvData = await response.text();
    
    // Parse CSV data
    const lines = csvData.trim().split('\n');
    if (lines.length <= 1) {
      return NextResponse.json({
        message: 'No hotspot data available',
        inserted: 0,
        updated: 0
      });
    }

    const headers = lines[0].split(',');
    const hotspotData: FIRMSResponse[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === headers.length) {
        const hotspot: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          switch (header.trim()) {
            case 'latitude':
            case 'longitude':
            case 'brightness':
            case 'scan':
            case 'track':
            case 'bright_t31':
            case 'frp':
              hotspot[header.trim()] = parseFloat(value) || null;
              break;
            case 'confidence':
              hotspot[header.trim()] = parseInt(value) || null;
              break;
            default:
              hotspot[header.trim()] = value;
          }
        });
        hotspotData.push(hotspot);
      }
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Process each hotspot
    for (const spot of hotspotData) {
      try {
        // Parse acquisition date and time
        const acqDate = new Date(spot.acq_date);
        const acqTime = spot.acq_time.padStart(4, '0'); // Ensure 4 digits

        // Check if hotspot already exists (same location, date, and satellite)
        const existing = await prisma.hotspot.findFirst({
          where: {
            latitude: spot.latitude,
            longitude: spot.longitude,
            acquisitionDate: acqDate,
            satellite: spot.satellite,
          }
        });

        if (existing) {
          // Update existing hotspot
          await prisma.hotspot.update({
            where: { id: existing.id },
            data: {
              brightness: spot.brightness,
              scan: spot.scan,
              track: spot.track,
              acquisitionTime: acqTime,
              instrument: spot.instrument,
              confidence: spot.confidence,
              version: spot.version,
              brightT31: spot.bright_t31,
              frp: spot.frp,
              daynight: spot.daynight,
              lastSeen: new Date(),
              isActive: true,
            }
          });
          updated++;
        } else {
          // Create new hotspot
          await prisma.hotspot.create({
            data: {
              latitude: spot.latitude,
              longitude: spot.longitude,
              brightness: spot.brightness,
              scan: spot.scan,
              track: spot.track,
              acquisitionDate: acqDate,
              acquisitionTime: acqTime,
              satellite: spot.satellite,
              instrument: spot.instrument,
              confidence: spot.confidence,
              version: spot.version,
              brightT31: spot.bright_t31,
              frp: spot.frp,
              daynight: spot.daynight,
              lastSeen: new Date(),
              isActive: true,
            }
          });
          inserted++;
        }
      } catch (error) {
        console.error('Error processing hotspot:', error, spot);
        errors++;
      }
    }

    // Mark old hotspots as inactive (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const deactivated = await prisma.hotspot.updateMany({
      where: {
        acquisitionDate: {
          lt: sevenDaysAgo
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    return NextResponse.json({
      message: 'Hotspot data synchronized successfully',
      source,
      area,
      days,
      totalProcessed: hotspotData.length,
      inserted,
      updated,
      errors,
      deactivated: deactivated.count,
      apiUrl: firmsUrl.replace(apiKey, '***') // Don't expose API key in response
    });

  } catch (error) {
    console.error('Hotspot sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync hotspot data', details: error },
      { status: 500 }
    );
  }
}
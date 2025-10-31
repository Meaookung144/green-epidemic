const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHotspots() {
  try {
    console.log('Checking hotspots in database...');
    
    const hotspots = await prisma.hotspot.findMany({
      take: 10,
      orderBy: { acquisitionDate: 'desc' },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        confidence: true,
        frp: true,
        satellite: true,
        acquisitionDate: true,
        isActive: true,
        createdAt: true,
      }
    });

    console.log(`Found ${hotspots.length} hotspots in database:`);
    hotspots.forEach((hotspot, index) => {
      console.log(`${index + 1}. Lat: ${hotspot.latitude.toFixed(4)}, Lon: ${hotspot.longitude.toFixed(4)}`);
      console.log(`   Confidence: ${hotspot.confidence}%, FRP: ${hotspot.frp}MW`);
      console.log(`   Satellite: ${hotspot.satellite}, Active: ${hotspot.isActive}`);
      console.log(`   Detected: ${hotspot.acquisitionDate.toISOString().split('T')[0]}`);
      console.log(`   Stored: ${hotspot.createdAt.toISOString()}`);
      console.log('');
    });

    // Get total count
    const totalCount = await prisma.hotspot.count();
    const activeCount = await prisma.hotspot.count({
      where: { isActive: true }
    });
    
    console.log(`\nTotal hotspots: ${totalCount}`);
    console.log(`Active hotspots: ${activeCount}`);
    
  } catch (error) {
    console.error('Error checking hotspots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHotspots();
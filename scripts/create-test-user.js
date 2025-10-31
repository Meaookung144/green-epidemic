const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    const testUser = await prisma.user.create({
      data: {
        email: 'test.user@example.com',
        name: 'Test User',
        role: 'USER',
        googleId: null,
        lineId: null,
      }
    });

    console.log('Test user created:', testUser);
    
    // Create another test user
    const testVolunteer = await prisma.user.create({
      data: {
        email: 'volunteer@example.com',
        name: 'Test Volunteer',
        role: 'VOLUNTEER',
        googleId: null,
        lineId: null,
      }
    });

    console.log('Test volunteer created:', testVolunteer);

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
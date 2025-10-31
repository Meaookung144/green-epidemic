const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking all users in database...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        googleId: true,
        lineId: true,
        createdAt: true,
      }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No name'} (${user.email || 'No email'})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Google ID: ${user.googleId || 'None'}`);
      console.log(`   LINE ID: ${user.lineId || 'None'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    const adminUsers = users.filter(user => user.role === 'ADMIN');
    console.log(`Admin users: ${adminUsers.length}`);
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
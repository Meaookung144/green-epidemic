import { prisma } from '../lib/prisma';

async function makeAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    
    console.log(`✅ User ${user.email} is now an admin`);
    console.log('User details:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    console.log('Make sure the user exists and has signed in at least once');
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: npx tsx scripts/make-admin.ts <email>');
  console.log('Example: npx tsx scripts/make-admin.ts user@example.com');
  process.exit(1);
}

makeAdmin(email);
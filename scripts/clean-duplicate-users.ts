import { prisma } from '../lib/prisma';

async function cleanDuplicateUsers() {
  try {
    // Find users with duplicate emails
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        googleId: true,
        lineId: true,
        createdAt: true,
        accounts: true,
      },
    });

    const emailMap = new Map<string, typeof users>();
    
    for (const user of users) {
      if (user.email) {
        if (!emailMap.has(user.email)) {
          emailMap.set(user.email, []);
        }
        emailMap.get(user.email)?.push(user);
      }
    }

    // Process duplicates
    for (const [email, userList] of emailMap.entries()) {
      if (userList.length > 1) {
        console.log(`Found ${userList.length} users with email: ${email}`);
        
        // Sort by creation date, keep the oldest
        userList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        const keepUser = userList[0];
        const deleteUsers = userList.slice(1);
        
        console.log(`  Keeping user: ${keepUser.id} (created: ${keepUser.createdAt})`);
        
        for (const user of deleteUsers) {
          console.log(`  Deleting user: ${user.id} (created: ${user.createdAt})`);
          
          // Delete related records first
          await prisma.account.deleteMany({ where: { userId: user.id } });
          await prisma.report.deleteMany({ where: { userId: user.id } });
          await prisma.surveillancePoint.deleteMany({ where: { userId: user.id } });
          await prisma.notification.deleteMany({ where: { userId: user.id } });
          await prisma.notificationPreference.deleteMany({ where: { userId: user.id } });
          
          // Delete the user
          await prisma.user.delete({ where: { id: user.id } });
        }
        
        // If the kept user doesn't have OAuth IDs but deleted ones did, merge them
        for (const deletedUser of deleteUsers) {
          if (!keepUser.googleId && deletedUser.googleId) {
            await prisma.user.update({
              where: { id: keepUser.id },
              data: { googleId: deletedUser.googleId }
            });
            console.log(`  Merged Google ID to kept user`);
          }
          if (!keepUser.lineId && deletedUser.lineId) {
            await prisma.user.update({
              where: { id: keepUser.id },
              data: { lineId: deletedUser.lineId }
            });
            console.log(`  Merged LINE ID to kept user`);
          }
        }
      }
    }

    console.log('\n✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicateUsers();
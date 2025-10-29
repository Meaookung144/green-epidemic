import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/integrations/line_official - Connect LINE Official Account
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For now, we'll simulate a connection process
    // In a real implementation, this would involve LINE LIFF (LINE Front-end Framework)
    // or webhook registration with LINE Messaging API
    
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        lineOfficialConnected: true,
        // In real implementation, this would be the actual LINE user ID
        lineOfficialUserId: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

    // Send a welcome message via LINE (simulated)
    console.log(`LINE connection established for user ${session.user.email}`);
    // In real implementation:
    // await sendLineMessage(updatedUser.lineOfficialUserId, 'Welcome to Green Epidemic! You will now receive environmental alerts.');

    return NextResponse.json({
      success: true,
      message: 'LINE Official Account connected successfully',
      user: {
        lineOfficialConnected: updatedUser.lineOfficialConnected,
        lineOfficialUserId: updatedUser.lineOfficialUserId
      }
    });

  } catch (error) {
    console.error('LINE connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect LINE Official Account' },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/line_official - Disconnect LINE Official Account
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        lineOfficialConnected: false,
        lineOfficialUserId: null
      }
    });

    console.log(`LINE connection removed for user ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'LINE Official Account disconnected successfully',
      user: {
        lineOfficialConnected: updatedUser.lineOfficialConnected,
        lineOfficialUserId: updatedUser.lineOfficialUserId
      }
    });

  } catch (error) {
    console.error('LINE disconnection error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect LINE Official Account' },
      { status: 500 }
    );
  }
}
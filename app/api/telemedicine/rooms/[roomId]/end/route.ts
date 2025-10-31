import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { meetingRoomService } from '@/lib/services/meetingRoomService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId } = await params;

    // Find consultation by room ID
    const consultation = await prisma.telemedConsultation.findFirst({
      where: {
        roomId: roomId,
        OR: [
          { patientId: (session.user as any).id },
          { doctorId: (session.user as any).id }
        ]
      }
    });

    if (!consultation) {
      return NextResponse.json(
        { error: 'Room not found or access denied' },
        { status: 404 }
      );
    }

    // End the Cloudflare room
    try {
      await meetingRoomService.endMeetingRoom(roomId);
    } catch (error) {
      console.error('Failed to end Cloudflare room:', error);
    }

    // Update consultation status if it's still in progress
    if (consultation.status === 'IN_PROGRESS') {
      const duration = consultation.startedAt 
        ? Math.round((new Date().getTime() - new Date(consultation.startedAt).getTime()) / 60000)
        : 0;

      await prisma.telemedConsultation.update({
        where: { id: consultation.id },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          duration,
          callUrl: null,
          roomId: null
        }
      });
    }

    return NextResponse.json({
      message: 'Room ended successfully'
    });

  } catch (error) {
    console.error('End room error:', error);
    return NextResponse.json(
      { error: 'Failed to end room' },
      { status: 500 }
    );
  }
}
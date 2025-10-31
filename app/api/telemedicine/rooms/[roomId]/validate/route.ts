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

    const { token } = await request.json();
    const { roomId } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find consultation by room ID
    const consultation = await prisma.telemedConsultation.findFirst({
      where: {
        roomId: roomId,
        OR: [
          { patientId: (session.user as any).id },
          { doctorId: (session.user as any).id }
        ]
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!consultation) {
      return NextResponse.json(
        { error: 'Room not found or access denied' },
        { status: 404 }
      );
    }

    // Verify room status with Cloudflare
    try {
      const roomStatus = await meetingRoomService.getRoomStatus(roomId);
      if (!roomStatus) {
        return NextResponse.json(
          { error: 'Room no longer exists' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('Room status check failed:', error);
      return NextResponse.json(
        { error: 'Failed to verify room status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      consultation,
      roomId,
      message: 'Room access validated'
    });

  } catch (error) {
    console.error('Room validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate room' },
      { status: 500 }
    );
  }
}
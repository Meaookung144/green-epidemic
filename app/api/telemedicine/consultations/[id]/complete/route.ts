import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/telemedicine/consultations/[id]/complete - Complete consultation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const { id: consultationId } = await params;

    const { doctorNotes, diagnosis, prescription, followUpNotes, followUpDate } = await request.json();

    // Verify consultation exists and user has permission
    const consultation = await prisma.telemedConsultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Check permissions - only the assigned doctor can complete
    if (userRole !== 'DOCTOR' || consultation.doctorId !== userId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Calculate duration if consultation was started
    let duration = null;
    if (consultation.startedAt) {
      const endTime = new Date();
      const startTime = new Date(consultation.startedAt);
      duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes
    }

    // Update consultation
    const updatedConsultation = await prisma.telemedConsultation.update({
      where: { id: consultationId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        duration,
        doctorNotes,
        diagnosis,
        prescription,
        followUpNotes,
        followUpDate: followUpDate ? new Date(followUpDate) : null
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            name: true,
            email: true
          }
        },
        riskAssessment: {
          select: {
            patientName: true,
            primarySymptoms: true,
            riskLevel: true
          }
        }
      }
    });

    return NextResponse.json({
      consultation: updatedConsultation,
      message: 'Consultation completed successfully'
    });

  } catch (error) {
    console.error('Complete consultation error:', error);
    return NextResponse.json(
      { error: 'Failed to complete consultation' },
      { status: 500 }
    );
  }
}
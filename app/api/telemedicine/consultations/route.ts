import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/telemedicine/consultations - Get consultations for user
export async function GET(request: NextRequest) {
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

    let whereClause: any = {};

    // Filter consultations based on user role
    if (userRole === 'DOCTOR') {
      whereClause.doctorId = userId;
    } else {
      whereClause.patientId = userId;
    }

    const consultations = await prisma.telemedConsultation.findMany({
      where: whereClause,
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
            riskLevel: true,
            recommendation: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      consultations
    });

  } catch (error) {
    console.error('Get consultations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    );
  }
}

// POST /api/telemedicine/consultations - Create new consultation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { chiefComplaint, scheduledAt, doctorId, riskAssessmentId } = await request.json();

    if (!chiefComplaint) {
      return NextResponse.json(
        { error: 'Chief complaint is required' },
        { status: 400 }
      );
    }

    // Create consultation
    let consultationData: any = {
      patientId: (session.user as any).id,
      chiefComplaint,
      status: 'PENDING'
    };

    if (scheduledAt) {
      consultationData.scheduledAt = new Date(scheduledAt);
      consultationData.status = 'SCHEDULED';
    }

    if (doctorId) {
      // Verify doctor exists
      const doctor = await prisma.user.findUnique({
        where: { id: doctorId, role: 'DOCTOR' }
      });
      
      if (doctor) {
        consultationData.doctorId = doctorId;
      }
    }

    // If linked to risk assessment, create relation
    if (riskAssessmentId) {
      // Verify risk assessment exists and belongs to user
      const riskAssessment = await prisma.riskAssessment.findFirst({
        where: {
          id: riskAssessmentId,
          OR: [
            { userId: (session.user as any).id },
            { assessedBy: (session.user as any).id }
          ]
        }
      });

      if (riskAssessment) {
        consultationData.riskAssessmentId = riskAssessmentId;
      }
    } else {
      // Create a basic risk assessment for this consultation
      const riskAssessment = await prisma.riskAssessment.create({
        data: {
          patientName: (session.user as any).name || 'Patient',
          patientAge: 30, // Default age, should be collected in booking form
          patientGender: 'Other', // Default, should be collected
          primarySymptoms: ['General consultation'],
          severity: 3,
          duration: 'Recent',
          riskLevel: 'MEDIUM',
          priority: 'ROUTINE',
          recommendation: 'TELEHEALTH',
          assessedBy: (session.user as any).id,
          userId: (session.user as any).id
        }
      });
      
      consultationData.riskAssessmentId = riskAssessment.id;
    }

    const consultation = await prisma.telemedConsultation.create({
      data: consultationData,
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
        }
      }
    });

    return NextResponse.json({
      consultation,
      message: 'Consultation booked successfully'
    });

  } catch (error) {
    console.error('Create consultation error:', error);
    return NextResponse.json(
      { error: 'Failed to create consultation' },
      { status: 500 }
    );
  }
}
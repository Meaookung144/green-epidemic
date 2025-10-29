import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/risk-assessment - Get risk assessments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // All authenticated users can view risk assessments
    const userRole = (session.user as any).role;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const riskLevel = searchParams.get('riskLevel');
    const priority = searchParams.get('priority');

    const whereClause: any = {};
    if (riskLevel) whereClause.riskLevel = riskLevel;
    if (priority) whereClause.priority = priority;

    const assessments = await prisma.riskAssessment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.riskAssessment.count({
      where: whereClause
    });

    return NextResponse.json({
      assessments,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Risk assessment GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk assessments' },
      { status: 500 }
    );
  }
}

// POST /api/risk-assessment - Create new risk assessment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // All authenticated users can create risk assessments
    const userRole = (session.user as any).role;

    const {
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      primarySymptoms,
      severity,
      duration,
      location,
      latitude,
      longitude,
      notes
    } = await request.json();

    // Validate required fields
    if (!patientName || !patientAge || !patientGender || !primarySymptoms || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate risk level and priority based on symptoms and severity
    const { riskLevel, priority, recommendation } = calculateRiskAssessment(
      primarySymptoms,
      severity,
      patientAge
    );

    const assessment = await prisma.riskAssessment.create({
      data: {
        patientName,
        patientAge: parseInt(patientAge),
        patientGender,
        patientPhone,
        primarySymptoms,
        severity: parseInt(severity),
        duration,
        riskLevel,
        priority,
        recommendation,
        notes,
        assessedBy: (session.user as any).id,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      assessment,
      message: 'Risk assessment created successfully'
    });

  } catch (error) {
    console.error('Risk assessment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create risk assessment' },
      { status: 500 }
    );
  }
}

// Risk assessment calculation logic
function calculateRiskAssessment(symptoms: string[], severity: number, age: number) {
  let riskScore = severity * 10; // Base score from severity (1-5 = 10-50)
  
  // Age risk factors
  if (age >= 65) riskScore += 20;
  else if (age >= 50) riskScore += 10;
  else if (age <= 2) riskScore += 15;

  // High-risk symptoms
  const highRiskSymptoms = [
    'difficulty breathing',
    'chest pain',
    'severe headache',
    'confusion',
    'high fever',
    'severe vomiting',
    'severe abdominal pain',
    'loss of consciousness',
    'severe allergic reaction'
  ];

  const criticalSymptoms = [
    'cannot breathe',
    'cardiac arrest',
    'unconscious',
    'severe bleeding',
    'severe burns'
  ];

  let hasHighRisk = false;
  let hasCritical = false;

  symptoms.forEach(symptom => {
    const lowerSymptom = symptom.toLowerCase();
    if (criticalSymptoms.some(cs => lowerSymptom.includes(cs))) {
      hasCritical = true;
      riskScore += 50;
    } else if (highRiskSymptoms.some(hrs => lowerSymptom.includes(hrs))) {
      hasHighRisk = true;
      riskScore += 25;
    }
  });

  // Determine risk level
  let riskLevel: string;
  let priority: string;
  let recommendation: string;

  if (hasCritical || riskScore >= 80) {
    riskLevel = 'CRITICAL';
    priority = 'EMERGENCY';
    recommendation = 'EMERGENCY';
  } else if (hasHighRisk || riskScore >= 60) {
    riskLevel = 'HIGH';
    priority = 'URGENT';
    recommendation = 'CLINIC_VISIT';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
    priority = 'URGENT';
    recommendation = 'TELEHEALTH';
  } else {
    riskLevel = 'LOW';
    priority = 'ROUTINE';
    recommendation = 'SELF_CARE';
  }

  return { riskLevel, priority, recommendation };
}
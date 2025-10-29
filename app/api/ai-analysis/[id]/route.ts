import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiAnalysisService } from '@/lib/services/aiAnalysisService';

// GET /api/ai-analysis/[id] - Get detailed analysis by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const analysis = await aiAnalysisService.getAnalysisById(params.id);
    
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Return detailed analysis data for users
    return NextResponse.json({
      id: analysis.id,
      title: analysis.title,
      summary: analysis.summary,
      analysis: analysis.analysis,
      recommendations: analysis.recommendations,
      severity: analysis.severity,
      confidence: analysis.confidence,
      weatherDataCount: analysis.weatherDataCount,
      reportsCount: analysis.reportsCount,
      timeframeStart: analysis.timeframeStart,
      timeframeEnd: analysis.timeframeEnd,
      createdAt: analysis.createdAt,
    });

  } catch (error) {
    console.error('AI analysis detail GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis details' },
      { status: 500 }
    );
  }
}
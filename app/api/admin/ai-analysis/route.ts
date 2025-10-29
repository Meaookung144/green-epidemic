import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiAnalysisService } from '@/lib/services/aiAnalysisService';

// GET /api/admin/ai-analysis - Get analysis history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const analysisId = searchParams.get('id');

    if (analysisId) {
      // Get specific analysis
      const analysis = await aiAnalysisService.getAnalysisById(analysisId);
      if (!analysis) {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(analysis);
    } else {
      // Get analysis history
      const analyses = await aiAnalysisService.getAnalysisHistory(limit);
      return NextResponse.json(analyses);
    }

  } catch (error) {
    console.error('AI analysis GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI analysis' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ai-analysis - Generate new analysis
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hoursBack = 24, force = false } = body;

    // Check if we should generate analysis
    if (!force && await aiAnalysisService.shouldGenerateAnalysis() === false) {
      const latest = await aiAnalysisService.getLatestAnalysis();
      return NextResponse.json({
        message: 'Recent analysis available',
        analysis: latest,
        generated: false
      });
    }

    // Generate new analysis
    const analysisId = await aiAnalysisService.generateAnalysis(
      (session.user as any).id,
      hoursBack
    );

    const analysis = await aiAnalysisService.getAnalysisById(analysisId);

    return NextResponse.json({
      message: 'Analysis generated successfully',
      analysis,
      generated: true
    });

  } catch (error) {
    console.error('AI analysis generation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate AI analysis',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
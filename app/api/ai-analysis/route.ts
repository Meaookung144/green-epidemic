import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiAnalysisService } from '@/lib/services/aiAnalysisService';

// GET /api/ai-analysis - Get latest analysis for users
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get latest analyses
    const analyses = await aiAnalysisService.getAnalysisHistory(limit);
    
    // Return public-facing analysis data (without sensitive details)
    const publicAnalyses = analyses.map(analysis => ({
      id: analysis.id,
      title: analysis.title,
      summary: analysis.summary,
      severity: analysis.severity,
      confidence: analysis.confidence,
      weatherDataCount: analysis.weatherDataCount,
      reportsCount: analysis.reportsCount,
      createdAt: analysis.createdAt,
    }));

    return NextResponse.json({
      analyses: publicAnalyses,
      hasData: analyses.length > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI analysis GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI analysis' },
      { status: 500 }
    );
  }
}

// POST /api/ai-analysis - Request new analysis generation (for users)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if recent analysis exists (prevent spam)
    const shouldGenerate = await aiAnalysisService.shouldGenerateAnalysis();
    if (!shouldGenerate) {
      const latest = await aiAnalysisService.getLatestAnalysis();
      return NextResponse.json({
        message: 'Recent analysis available',
        analysis: latest ? {
          id: latest.id,
          title: latest.title,
          summary: latest.summary,
          severity: latest.severity,
          confidence: latest.confidence,
          createdAt: latest.createdAt,
        } : null,
        generated: false,
        cooldown: true
      });
    }

    // Generate new analysis (marked as user-requested)
    const analysisId = await aiAnalysisService.generateAnalysis(
      `USER-${(session.user as any).id}`,
      24
    );

    const analysis = await aiAnalysisService.getAnalysisById(analysisId);

    return NextResponse.json({
      message: 'Analysis generated successfully',
      analysis: analysis ? {
        id: analysis.id,
        title: analysis.title,
        summary: analysis.summary,
        severity: analysis.severity,
        confidence: analysis.confidence,
        createdAt: analysis.createdAt,
      } : null,
      generated: true
    });

  } catch (error) {
    console.error('AI analysis generation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate AI analysis'
      },
      { status: 500 }
    );
  }
}
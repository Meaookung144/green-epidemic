import { NextRequest, NextResponse } from 'next/server';
import { aiAnalysisService } from '@/lib/services/aiAnalysisService';

// POST /api/admin/ai-analysis/auto - Automatic analysis generation (for cron jobs)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting automatic AI analysis generation...');

    // Check if we need to generate a new analysis
    const shouldGenerate = await aiAnalysisService.shouldGenerateAnalysis();
    
    if (!shouldGenerate) {
      const latest = await aiAnalysisService.getLatestAnalysis();
      console.log('Recent analysis available, skipping generation');
      return NextResponse.json({
        message: 'Recent analysis available (within 24 hours)',
        analysis: {
          id: latest?.id,
          title: latest?.title,
          createdAt: latest?.createdAt,
        },
        generated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Generate new analysis
    console.log('Generating new automatic AI analysis...');
    const analysisId = await aiAnalysisService.generateAnalysis('AUTO', 24);
    
    const analysis = await aiAnalysisService.getAnalysisById(analysisId);

    console.log(`✓ Automatic AI analysis generated: ${analysis?.title}`);

    return NextResponse.json({
      message: 'Automatic AI analysis generated successfully',
      analysis: {
        id: analysis?.id,
        title: analysis?.title,
        severity: analysis?.severity,
        confidence: analysis?.confidence,
        weatherDataCount: analysis?.weatherDataCount,
        reportsCount: analysis?.reportsCount,
      },
      generated: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Automatic AI analysis error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate automatic AI analysis',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/ai-analysis/auto - Check if auto analysis is needed (for monitoring)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const shouldGenerate = await aiAnalysisService.shouldGenerateAnalysis();
    const latest = await aiAnalysisService.getLatestAnalysis();

    return NextResponse.json({
      shouldGenerate,
      latestAnalysis: latest ? {
        id: latest.id,
        title: latest.title,
        severity: latest.severity,
        generatedBy: latest.generatedBy,
        createdAt: latest.createdAt,
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto analysis check error:', error);
    return NextResponse.json(
      { error: 'Failed to check analysis status' },
      { status: 500 }
    );
  }
}
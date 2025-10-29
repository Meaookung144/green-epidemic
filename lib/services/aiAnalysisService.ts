import { prisma } from '@/lib/prisma';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AnalysisData {
  weatherData: Array<{
    latitude: number;
    longitude: number;
    pm25: number | null;
    aqi: number | null;
    temperature: number | null;
    humidity: number | null;
    airQualitySource: string | null;
    recordedAt: Date;
  }>;
  reports: Array<{
    type: string;
    severity: number;
    latitude: number;
    longitude: number;
    symptoms: string[];
    status: string;
    reportDate: Date;
  }>;
  timeframeStart: Date;
  timeframeEnd: Date;
}

interface AnalysisResult {
  title: string;
  summary: string;
  analysis: string;
  recommendations: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
}

export class AIAnalysisService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  }

  async shouldGenerateAnalysis(): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentAnalysis = await prisma.aIAnalysis.findFirst({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
        generatedBy: 'AUTO',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return !recentAnalysis;
  }

  async getAnalysisData(hoursBack: number = 24): Promise<AnalysisData> {
    const timeframeEnd = new Date();
    const timeframeStart = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Get weather data from the last 24 hours
    const weatherData = await prisma.weatherData.findMany({
      where: {
        recordedAt: {
          gte: timeframeStart,
          lte: timeframeEnd,
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: 100, // Limit to most recent 100 data points
    });

    // Get health reports from the last 7 days for better context
    const reportTimeframe = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reports = await prisma.report.findMany({
      where: {
        reportDate: {
          gte: reportTimeframe,
          lte: timeframeEnd,
        },
        status: 'APPROVED',
      },
      orderBy: {
        reportDate: 'desc',
      },
      take: 50, // Limit to 50 most recent reports
    });

    return {
      weatherData,
      reports,
      timeframeStart,
      timeframeEnd,
    };
  }

  private async callDeepSeek(messages: DeepSeekMessage[]): Promise<string> {
    if (!this.apiKey || this.apiKey === 'your-deepseek-api-key') {
      console.warn('DeepSeek API key not configured, using fallback analysis');
      // Return a structured fallback response in Thai
      return JSON.stringify({
        title: 'การวิเคราะห์สุขภาพสิ่งแวดล้อม',
        summary: 'การวิเคราะห์สร้างขึ้นจากการประมวลผลข้อมูลภายในระบบ ไม่สามารถใช้ AI วิเคราะห์ได้',
        analysis: 'ระบบได้ประมวลผลข้อมูลสิ่งแวดล้อมและสุขภาพเรียบร้อยแล้ว แนะนำให้มีการตรวจสอบด้วยตนเองเพื่อข้อมูลเชิงลึกที่ละเอียด',
        recommendations: 'ติดตามระดับคุณภาพอากาศและตรวจสอบรายงานสุขภาพ ปรึกษาผู้เชี่ยวชาญด้านสุขภาพสิ่งแวดล้อมเพื่อการประเมินที่ครอบคลุม',
        severity: 'MEDIUM',
        confidence: 0.6
      });
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data: DeepSeekResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private generateAnalysisPrompt(data: AnalysisData): DeepSeekMessage[] {
    const weatherSummary = this.summarizeWeatherData(data.weatherData);
    const healthSummary = this.summarizeHealthReports(data.reports);

    return [
      {
        role: 'system',
        content: `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์สุขภาพสิ่งแวดล้อมสำหรับระบบตรวจสอบ Green Epidemic ของประเทศไทย 
        วิเคราะห์ข้อมูลสิ่งแวดล้อมและสุขภาพเพื่อให้ข้อมูลเชิงลึกที่สามารถนำไปปฏิบัติได้สำหรับหน่วยงานสาธารณสุข
        
        การวิเคราะห์ของคุณควรมีลักษณะ:
        - ถูกต้องทางวิทยาศาสตร์และอิงหลักฐาน
        - มุ่งเน้นคำแนะนำที่สามารถนำไปปฏิบัติได้
        - เหมาะสมกับบริบทและสภาพอากาศของไทย
        - ชัดเจนและเข้าใจง่ายสำหรับเจ้าหน้าที่รัฐ
        - เขียนเป็นภาษาไทยที่เป็นทางการ
        
        สำคัญมาก: คุณต้องตอบด้วย JSON ที่ถูกต้องเท่านั้น ห้ามใส่ข้อความใดๆ ก่อนหรือหลัง JSON object
        
        ให้จัดรูปแบบการตอบเป็น JSON object เดียวที่มีฟิลด์เหล่านี้:
        {
          "title": "หัวข้อที่อธิบายสั้นๆ ภาษาไทย (ไม่เกิน 100 ตัวอักษร)",
          "summary": "สรุปผู้บริหาร ภาษาไทย (ไม่เกิน 500 ตัวอักษร)",
          "analysis": "การวิเคราะห์โดยละเอียด ภาษาไทย (ไม่เกิน 2000 ตัวอักษร)",
          "recommendations": "ข้อแนะนำเฉพาะที่สามารถปฏิบัติได้ ภาษาไทย (ไม่เกิน 1500 ตัวอักษร)",
          "severity": "LOW|MEDIUM|HIGH|CRITICAL",
          "confidence": 0.85
        }
        
        ตัวอย่างรูปแบบการตอบ:
        {"title":"เตือนภัยคุณภาพอากาศ - พื้นที่กรุงเทพมหานคร","summary":"พบระดับ PM2.5 สูงขึ้น...","analysis":"ข้อมูลปัจจุบันแสดงให้เห็น...","recommendations":"1. ออกประกาศเตือนภัยสุขภาพ...","severity":"HIGH","confidence":0.85}`
      },
      {
        role: 'user',
        content: `กรุณาวิเคราะห์สถานการณ์สิ่งแวดล้อมและสุขภาพปัจจุบันในประเทศไทยตามข้อมูลนี้:

ENVIRONMENTAL DATA (${data.timeframeStart.toISOString()} to ${data.timeframeEnd.toISOString()}):
${weatherSummary}

HEALTH REPORTS (Last 7 days):
${healthSummary}

Please provide a comprehensive analysis of:
1. Current air quality trends and health risks
2. Geographic patterns and hotspots
3. Correlation between environmental factors and health reports
4. Immediate and long-term recommendations for public health response
5. Risk assessment for the coming days

Consider seasonal factors, urban vs rural differences, and Thailand's unique environmental challenges.`
      }
    ];
  }

  private summarizeWeatherData(weatherData: AnalysisData['weatherData']): string {
    if (weatherData.length === 0) return 'No weather data available.';

    const pm25Values = weatherData.filter(d => d.pm25 !== null).map(d => d.pm25!);
    const aqiValues = weatherData.filter(d => d.aqi !== null).map(d => d.aqi!);
    const tempValues = weatherData.filter(d => d.temperature !== null).map(d => d.temperature!);

    const avgPM25 = pm25Values.length > 0 ? pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length : null;
    const maxPM25 = pm25Values.length > 0 ? Math.max(...pm25Values) : null;
    const avgAQI = aqiValues.length > 0 ? aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length : null;
    const avgTemp = tempValues.length > 0 ? tempValues.reduce((a, b) => a + b, 0) / tempValues.length : null;

    const sourceCounts = weatherData.reduce((acc, d) => {
      if (d.airQualitySource) {
        acc[d.airQualitySource] = (acc[d.airQualitySource] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return `
Data Points: ${weatherData.length} measurements
PM2.5: Average ${avgPM25?.toFixed(1)}μg/m³, Max ${maxPM25?.toFixed(1)}μg/m³
AQI: Average ${avgAQI?.toFixed(0)}
Temperature: Average ${avgTemp?.toFixed(1)}°C
Data Sources: ${Object.entries(sourceCounts).map(([k, v]) => `${k}(${v})`).join(', ')}
Geographic Coverage: ${new Set(weatherData.map(d => `${d.latitude.toFixed(2)},${d.longitude.toFixed(2)}`)).size} locations`;
  }

  private summarizeHealthReports(reports: AnalysisData['reports']): string {
    if (reports.length === 0) return 'No health reports available.';

    const typeCounts = reports.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityCounts = reports.reduce((acc, r) => {
      const level = r.severity <= 2 ? 'Low' : r.severity <= 3 ? 'Medium' : 'High';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgSeverity = reports.reduce((sum, r) => sum + r.severity, 0) / reports.length;

    return `
Total Reports: ${reports.length}
Types: ${Object.entries(typeCounts).map(([k, v]) => `${k}(${v})`).join(', ')}
Severity Distribution: ${Object.entries(severityCounts).map(([k, v]) => `${k}(${v})`).join(', ')}
Average Severity: ${avgSeverity.toFixed(1)}/5
Geographic Spread: ${new Set(reports.map(r => `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`)).size} locations`;
  }

  async generateAnalysis(generatedBy: string = 'AUTO', hoursBack: number = 24): Promise<string> {
    console.log(`Starting AI analysis generation by ${generatedBy}...`);

    try {
      // Get analysis data
      const data = await this.getAnalysisData(hoursBack);
      console.log(`Retrieved ${data.weatherData.length} weather points and ${data.reports.length} health reports`);

      // Generate AI analysis
      const messages = this.generateAnalysisPrompt(data);
      const aiResponse = await this.callDeepSeek(messages);
      console.log('Received AI response from DeepSeek');

      // Parse AI response
      let analysisResult: AnalysisResult;
      try {
        // First try to parse as-is
        analysisResult = JSON.parse(aiResponse);
      } catch (parseError) {
        console.log('Initial JSON parse failed, trying to extract JSON from response...');
        console.log('Raw AI response:', aiResponse);
        
        // Try to extract JSON from the response (sometimes AI adds explanation text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysisResult = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from AI response');
          } catch (extractError) {
            console.error('Failed to parse extracted JSON:', extractError);
            console.error('Extracted text:', jsonMatch[0]);
            throw new Error('Invalid AI response format - could not extract valid JSON');
          }
        } else {
          console.error('No JSON found in AI response:', aiResponse);
          throw new Error('Invalid AI response format - no JSON found');
        }
      }

      // Validate required fields and provide fallbacks
      if (!analysisResult.title || !analysisResult.summary) {
        console.error('AI response missing required fields:', analysisResult);
        
        // Create fallback analysis if critical fields are missing (in Thai)
        analysisResult = {
          title: analysisResult.title || `การวิเคราะห์สิ่งแวดล้อม - ${new Date().toLocaleDateString('th-TH')}`,
          summary: analysisResult.summary || 'การวิเคราะห์เสร็จสิ้นตามข้อมูลสิ่งแวดล้อมและสุขภาพปัจจุบัน',
          analysis: analysisResult.analysis || 'ข้อมูลการวิเคราะห์โดยละเอียดได้รับการประมวลผลแล้ว แต่การจัดรูปแบบยังไม่สมบูรณ์',
          recommendations: analysisResult.recommendations || 'กรุณาปรึกษาหน่วยงานสาธารณสุขเพื่อคำแนะนำเฉพาะ',
          severity: (analysisResult.severity as any) || 'MEDIUM',
          confidence: typeof analysisResult.confidence === 'number' ? analysisResult.confidence : 0.5
        };
        console.log('Using fallback analysis data');
      }

      // Ensure severity is valid
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (!validSeverities.includes(analysisResult.severity)) {
        console.warn(`Invalid severity "${analysisResult.severity}", defaulting to MEDIUM`);
        analysisResult.severity = 'MEDIUM';
      }

      // Save to database
      const savedAnalysis = await prisma.aIAnalysis.create({
        data: {
          title: analysisResult.title,
          summary: analysisResult.summary,
          analysis: analysisResult.analysis,
          recommendations: analysisResult.recommendations || '',
          severity: analysisResult.severity || 'MEDIUM',
          confidence: Math.max(0, Math.min(1, analysisResult.confidence || 0.7)),
          weatherDataCount: data.weatherData.length,
          reportsCount: data.reports.length,
          timeframeStart: data.timeframeStart,
          timeframeEnd: data.timeframeEnd,
          generatedBy,
          model: 'deepseek-chat',
          version: '1.0',
        },
      });

      console.log(`AI analysis saved with ID: ${savedAnalysis.id}`);
      return savedAnalysis.id;

    } catch (error) {
      console.error('Error generating AI analysis:', error);
      throw error;
    }
  }

  async getLatestAnalysis() {
    return await prisma.aIAnalysis.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAnalysisHistory(limit: number = 10) {
    return await prisma.aIAnalysis.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        title: true,
        summary: true,
        severity: true,
        confidence: true,
        generatedBy: true,
        weatherDataCount: true,
        reportsCount: true,
        createdAt: true,
      },
    });
  }

  async getAnalysisById(id: string) {
    return await prisma.aIAnalysis.findUnique({
      where: { id },
    });
  }
}

export const aiAnalysisService = new AIAnalysisService();
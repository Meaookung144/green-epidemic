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
    pm10: number | null;
    aqi: number | null;
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    airQualitySource: string | null;
    stationName: string | null;
    recordedAt: Date;
  }>;
  reports: Array<{
    id: string;
    type: string;
    severity: number;
    latitude: number;
    longitude: number;
    symptoms: string[];
    status: string;
    reportDate: Date;
    userId: string;
  }>;
  bulkHealthStats: Array<{
    province: string;
    district: string | null;
    diseaseType: string;
    caseCount: number;
    populationCount: number | null;
    severity: string | null;
    ageGroup: string | null;
    gender: string | null;
    reportDate: Date;
    sourceType: string;
  }>;
  riskAssessments: Array<{
    riskLevel: string;
    primarySymptoms: string[];
    severity: number;
    patientAge: number;
    patientGender: string;
    latitude: number | null;
    longitude: number | null;
    createdAt: Date;
  }>;
  aiHealthChats: Array<{
    suggestedSymptoms: string[];
    riskLevel: string;
    shouldConsultDoctor: boolean;
    createdAt: Date;
    messageCount: number;
  }>;
  userDemographics: {
    totalUsers: number;
    usersByRole: Record<string, number>;
    usersByProvince: Record<string, number>;
    activeUsers: number;
  };
  historicalTrends: {
    weatherTrends: Array<{
      date: string;
      avgPM25: number | null;
      avgAQI: number | null;
      avgTemp: number | null;
      dataPoints: number;
    }>;
    healthTrends: Array<{
      date: string;
      reportCount: number;
      avgSeverity: number;
      symptomDistribution: Record<string, number>;
    }>;
  };
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

    // Get comprehensive weather data with all metrics
    const weatherData = await prisma.weatherData.findMany({
      where: {
        recordedAt: {
          gte: timeframeStart,
          lte: timeframeEnd,
        },
      },
      select: {
        latitude: true,
        longitude: true,
        pm25: true,
        pm10: true,
        aqi: true,
        temperature: true,
        humidity: true,
        windSpeed: true,
        windDirection: true,
        airQualitySource: true,
        stationName: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: 500, // Increased limit for better analysis
    });

    // Get health reports from the last 7 days with user context
    const reportTimeframe = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reports = await prisma.report.findMany({
      where: {
        reportDate: {
          gte: reportTimeframe,
          lte: timeframeEnd,
        },
        status: 'APPROVED',
      },
      select: {
        id: true,
        type: true,
        severity: true,
        latitude: true,
        longitude: true,
        symptoms: true,
        status: true,
        reportDate: true,
        userId: true,
      },
      orderBy: {
        reportDate: 'desc',
      },
      take: 200, // Increased for better pattern analysis
    });

    // Get bulk health statistics from the last 30 days
    const bulkStatsTimeframe = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const bulkHealthStats = await prisma.bulkHealthStatistic.findMany({
      where: {
        reportDate: {
          gte: bulkStatsTimeframe,
          lte: timeframeEnd,
        },
      },
      select: {
        province: true,
        district: true,
        diseaseType: true,
        caseCount: true,
        populationCount: true,
        severity: true,
        ageGroup: true,
        gender: true,
        reportDate: true,
        sourceType: true,
      },
      orderBy: {
        reportDate: 'desc',
      },
      take: 1000, // Comprehensive bulk data
    });

    // Get risk assessments from the last 7 days
    const riskAssessments = await prisma.riskAssessment.findMany({
      where: {
        createdAt: {
          gte: reportTimeframe,
          lte: timeframeEnd,
        },
      },
      select: {
        riskLevel: true,
        primarySymptoms: true,
        severity: true,
        patientAge: true,
        patientGender: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    // Get AI health chat summaries from the last 7 days
    const aiHealthChats = await prisma.aIHealthChat.findMany({
      where: {
        createdAt: {
          gte: reportTimeframe,
          lte: timeframeEnd,
        },
      },
      select: {
        suggestedSymptoms: true,
        riskLevel: true,
        shouldConsultDoctor: true,
        createdAt: true,
        messages: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    // Transform AI chat data
    const transformedAiChats = aiHealthChats.map(chat => ({
      suggestedSymptoms: chat.suggestedSymptoms || [],
      riskLevel: chat.riskLevel || 'MEDIUM',
      shouldConsultDoctor: chat.shouldConsultDoctor || false,
      createdAt: chat.createdAt,
      messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
    }));

    // Get user demographics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Active in last 30 days
        },
      },
    });

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });

    // Get users by province (from home address or reports)
    const usersWithLocation = await prisma.user.findMany({
      where: {
        OR: [
          { homeLatitude: { not: null } },
          { reports: { some: {} } },
        ],
      },
      select: {
        homeAddress: true,
        reports: {
          select: {
            latitude: true,
            longitude: true,
          },
          take: 1,
        },
      },
    });

    // Calculate historical trends for the last 30 days
    const trendDays = 30;
    const weatherTrends = [];
    const healthTrends = [];

    for (let i = trendDays; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Weather trend for this day
      const dayWeatherData = await prisma.weatherData.findMany({
        where: {
          recordedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          pm25: true,
          aqi: true,
          temperature: true,
        },
      });

      const validPM25 = dayWeatherData.filter(d => d.pm25 !== null).map(d => d.pm25!);
      const validAQI = dayWeatherData.filter(d => d.aqi !== null).map(d => d.aqi!);
      const validTemp = dayWeatherData.filter(d => d.temperature !== null).map(d => d.temperature!);

      weatherTrends.push({
        date: dayStart.toISOString().split('T')[0],
        avgPM25: validPM25.length > 0 ? validPM25.reduce((a, b) => a + b) / validPM25.length : null,
        avgAQI: validAQI.length > 0 ? validAQI.reduce((a, b) => a + b) / validAQI.length : null,
        avgTemp: validTemp.length > 0 ? validTemp.reduce((a, b) => a + b) / validTemp.length : null,
        dataPoints: dayWeatherData.length,
      });

      // Health trend for this day
      const dayReports = await prisma.report.findMany({
        where: {
          reportDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: 'APPROVED',
        },
        select: {
          severity: true,
          symptoms: true,
        },
      });

      const symptomDistribution: Record<string, number> = {};
      dayReports.forEach(report => {
        report.symptoms.forEach(symptom => {
          symptomDistribution[symptom] = (symptomDistribution[symptom] || 0) + 1;
        });
      });

      healthTrends.push({
        date: dayStart.toISOString().split('T')[0],
        reportCount: dayReports.length,
        avgSeverity: dayReports.length > 0 
          ? dayReports.reduce((sum, r) => sum + (r.severity ?? 0), 0) / dayReports.length 
          : 0,
        symptomDistribution,
      });
    }

    // Process user demographics
    const roleDistribution = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Simple province extraction from addresses (this could be enhanced with geocoding)
    const provinceDistribution: Record<string, number> = {};
    usersWithLocation.forEach(user => {
      if (user.homeAddress) {
        // Extract province from address (simplified - could use proper address parsing)
        const address = user.homeAddress.toLowerCase();
        if (address.includes('กรุงเทพ') || address.includes('bangkok')) {
          provinceDistribution['กรุงเทพมหานคร'] = (provinceDistribution['กรุงเทพมหานคร'] || 0) + 1;
        } else if (address.includes('เชียงใหม่')) {
          provinceDistribution['เชียงใหม่'] = (provinceDistribution['เชียงใหม่'] || 0) + 1;
        } else {
          provinceDistribution['อื่นๆ'] = (provinceDistribution['อื่นๆ'] || 0) + 1;
        }
      }
    });

    return {
      weatherData,
      reports: reports.map(r => ({
        ...r,
        severity: r.severity ?? 0,
        type: r.type as string,
        status: r.status as string
      })),
      bulkHealthStats,
      riskAssessments,
      aiHealthChats: transformedAiChats,
      userDemographics: {
        totalUsers,
        usersByRole: roleDistribution,
        usersByProvince: provinceDistribution,
        activeUsers,
      },
      historicalTrends: {
        weatherTrends,
        healthTrends,
      },
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
    const bulkStatsSummary = this.summarizeBulkHealthStats(data.bulkHealthStats);
    const riskAssessmentSummary = this.summarizeRiskAssessments(data.riskAssessments);
    const aiChatSummary = this.summarizeAIHealthChats(data.aiHealthChats);
    const demographicSummary = this.summarizeUserDemographics(data.userDemographics);
    const trendSummary = this.summarizeHistoricalTrends(data.historicalTrends);

    return [
      {
        role: 'system',
        content: `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์สุขภาพสิ่งแวดล้อมระดับชาติสำหรับระบบตรวจสอบ Green Epidemic ของประเทศไทย 
        วิเคราะห์ข้อมูลเชิงลึกด้านสิ่งแวดล้อม สุขภาพ และพฤติกรรมของประชากรเพื่อให้ข้อมูลเชิงลึกที่สามารถนำไปปฏิบัติได้สำหรับหน่วยงานสาธารณสุข
        
        คุณจะได้รับข้อมูลหลายมิติ:
        - ข้อมูลสิ่งแวดล้อมรายละเอียด (PM2.5, PM10, AQI, อุณหภูมิ, ลม)
        - รายงานสุขภาพจากประชาชน
        - สถิติสุขภาพจำนวนมากจากหน่วยงานราชการ  
        - การประเมินความเสี่ยงจากแพทย์
        - การปรึกษา AI ด้านสุขภาพ
        - ข้อมูลประชากรและการใช้งานระบบ
        - แนวโน้มทางประวัติศาสตร์ 30 วัน
        
        การวิเคราะห์ของคุณควรมีลักษณะ:
        - ถูกต้องทางวิทยาศาสตร์และอิงหลักฐานข้อมูลจริง
        - มุ่งเน้นคำแนะนำเชิงนโยบายและการปฏิบัติที่เป็นรูปธรรม
        - เหมาะสมกับบริบทภูมิศาสตร์และสภาพอากาศของไทย
        - ระบุแนวโน้ม รูปแบบ และความสัมพันธ์เชิงสาเหตุ
        - เขียนเป็นภาษาไทยที่เป็นทางการและเข้าใจง่าย
        - ให้คะแนนความมั่นใจตามคุณภาพและปริมาณข้อมูล
        
        สำคัญมาก: คุณต้องตอบด้วย JSON ที่ถูกต้องเท่านั้น ห้ามใส่ข้อความใดๆ ก่อนหรือหลัง JSON object
        
        ให้จัดรูปแบบการตอบเป็น JSON object เดียวที่มีฟิลด์เหล่านี้:
        {
          "title": "หัวข้อที่อธิบายสั้นๆ ภาษาไทย (ไม่เกิน 120 ตัวอักษร)",
          "summary": "สรุปผู้บริหารเชิงลึก ภาษาไทย (ไม่เกิน 800 ตัวอักษร)",
          "analysis": "การวิเคราะห์โดยละเอียดเชิงลึก ภาษาไทย (ไม่เกิน 3000 ตัวอักษร)",
          "recommendations": "ข้อแนะนำเชิงนโยบายที่สามารถปฏิบัติได้ ภาษาไทย (ไม่เกิน 2000 ตัวอักษร)",
          "severity": "LOW|MEDIUM|HIGH|CRITICAL",
          "confidence": 0.95
        }
        
        ตัวอย่างรูปแบบการตอบ:
        {"title":"วิกฤตคุณภาพอากาศเฉียบพลัน - กรุงเทพฯและปริมณฑล","summary":"พบระดับ PM2.5 เพิ่มสูงขึ้น 35% ในช่วง 7 วันที่ผ่านมา...","analysis":"การวิเคราะห์ข้อมูลแบบองค์รวมแสดงให้เห็นความสัมพันธ์...","recommendations":"1. ประกาศเตือนภัยสุขภาพระดับสีแดง 2. เปิดศูนย์พักพิงอากาศสะอาด...","severity":"HIGH","confidence":0.92}`
      },
      {
        role: 'user',
        content: `กรุณาวิเคราะห์สถานการณ์สิ่งแวดล้อมและสุขภาพปัจจุบันในประเทศไทยตามข้อมูลเชิงลึกนี้:

═══ ข้อมูลสิ่งแวดล้อม (${data.timeframeStart.toISOString()} ถึง ${data.timeframeEnd.toISOString()}) ═══
${weatherSummary}

═══ รายงานสุขภาพจากประชาชน (7 วันที่ผ่านมา) ═══
${healthSummary}

═══ สถิติสุขภาพจำนวนมาก (30 วันที่ผ่านมา) ═══
${bulkStatsSummary}

═══ การประเมินความเสี่ยงจากแพทย์ (7 วันที่ผ่านมา) ═══
${riskAssessmentSummary}

═══ การปรึกษา AI ด้านสุขภาพ (7 วันที่ผ่านมา) ═══
${aiChatSummary}

═══ ข้อมูลประชากรและการใช้งาน ═══
${demographicSummary}

═══ แนวโน้มทางประวัติศาสตร์ (30 วัน) ═══
${trendSummary}

กรุณาให้การวิเคราะห์ที่ครอบคลุม:
1. แนวโน้มคุณภาพอากาศปัจจุบันและความเสี่ยงต่อสุขภาพ
2. รูปแบบทางภูมิศาสตร์และจุดเสี่ยงสูง  
3. ความสัมพันธ์ระหว่างปัจจัยสิ่งแวดล้อมและรายงานสุขภาพ
4. การวิเคราะห์แนวโน้มและรูปแบบจากข้อมูลประวัติศาสตร์
5. ข้อเสนอแนะเชิงนโยบายทั้งระยะสั้นและระยะยาว
6. การประเมินความเสี่ยงสำหรับวันข้างหน้า
7. ข้อเสนอแนะเฉพาะสำหรับกลุ่มเสี่ยงต่างๆ

พิจารณาปัจจัยตามฤดูกาล ความแตกต่างระหว่างเมืองและชนบท และความท้าทายด้านสิ่งแวดล้อมที่เป็นเอกลักษณ์ของไทย`
      }
    ];
  }

  private summarizeWeatherData(weatherData: AnalysisData['weatherData']): string {
    if (weatherData.length === 0) return 'ไม่มีข้อมูลสิ่งแวดล้อม';

    const pm25Values = weatherData.filter(d => d.pm25 !== null).map(d => d.pm25!);
    const pm10Values = weatherData.filter(d => d.pm10 !== null).map(d => d.pm10!);
    const aqiValues = weatherData.filter(d => d.aqi !== null).map(d => d.aqi!);
    const tempValues = weatherData.filter(d => d.temperature !== null).map(d => d.temperature!);
    const humidityValues = weatherData.filter(d => d.humidity !== null).map(d => d.humidity!);
    const windSpeedValues = weatherData.filter(d => d.windSpeed !== null).map(d => d.windSpeed!);

    const avgPM25 = pm25Values.length > 0 ? pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length : null;
    const maxPM25 = pm25Values.length > 0 ? Math.max(...pm25Values) : null;
    const minPM25 = pm25Values.length > 0 ? Math.min(...pm25Values) : null;
    
    const avgPM10 = pm10Values.length > 0 ? pm10Values.reduce((a, b) => a + b, 0) / pm10Values.length : null;
    const maxPM10 = pm10Values.length > 0 ? Math.max(...pm10Values) : null;
    
    const avgAQI = aqiValues.length > 0 ? aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length : null;
    const maxAQI = aqiValues.length > 0 ? Math.max(...aqiValues) : null;
    
    const avgTemp = tempValues.length > 0 ? tempValues.reduce((a, b) => a + b, 0) / tempValues.length : null;
    const maxTemp = tempValues.length > 0 ? Math.max(...tempValues) : null;
    const minTemp = tempValues.length > 0 ? Math.min(...tempValues) : null;
    
    const avgHumidity = humidityValues.length > 0 ? humidityValues.reduce((a, b) => a + b, 0) / humidityValues.length : null;
    const avgWindSpeed = windSpeedValues.length > 0 ? windSpeedValues.reduce((a, b) => a + b, 0) / windSpeedValues.length : null;

    const sourceCounts = weatherData.reduce((acc, d) => {
      if (d.airQualitySource) {
        acc[d.airQualitySource] = (acc[d.airQualitySource] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const stationCounts = weatherData.reduce((acc, d) => {
      if (d.stationName) {
        acc[d.stationName] = (acc[d.stationName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Air quality assessment
    const dangerousPM25Count = pm25Values.filter(v => v > 75).length;
    const unhealthyPM25Count = pm25Values.filter(v => v > 55 && v <= 75).length;
    const moderatePM25Count = pm25Values.filter(v => v > 35 && v <= 55).length;

    return `
จำนวนข้อมูล: ${weatherData.length} การวัด จาก ${new Set(weatherData.map(d => `${d.latitude.toFixed(2)},${d.longitude.toFixed(2)}`)).size} จุด

ค่าฝุ่น PM2.5: เฉลี่ย ${avgPM25?.toFixed(1)}μg/m³ (ต่ำสุด ${minPM25?.toFixed(1)}, สูงสุด ${maxPM25?.toFixed(1)})
- ระดับอันตราย (>75): ${dangerousPM25Count} การวัด (${((dangerousPM25Count/pm25Values.length)*100).toFixed(1)}%)
- ระดับไม่เหมาะสำหรับสุขภาพ (55-75): ${unhealthyPM25Count} การวัด
- ระดับปานกลาง (35-55): ${moderatePM25Count} การวัด

ค่าฝุ่น PM10: เฉลี่ย ${avgPM10?.toFixed(1)}μg/m³ (สูงสุด ${maxPM10?.toFixed(1)})
คุณภาพอากาศ AQI: เฉลี่ย ${avgAQI?.toFixed(0)} (สูงสุด ${maxAQI?.toFixed(0)})
อุณหภูมิ: เฉลี่ย ${avgTemp?.toFixed(1)}°C (${minTemp?.toFixed(1)}-${maxTemp?.toFixed(1)}°C)
ความชื้น: เฉลี่ย ${avgHumidity?.toFixed(1)}%
ความเร็วลม: เฉลี่ย ${avgWindSpeed?.toFixed(1)} m/s

สถานีตรวจวัด: ${Object.keys(stationCounts).length} สถานี
แหล่งข้อมูล: ${Object.entries(sourceCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`;
  }

  private summarizeHealthReports(reports: AnalysisData['reports']): string {
    if (reports.length === 0) return 'ไม่มีรายงานสุขภาพจากประชาชน';

    const typeCounts = reports.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityCounts = reports.reduce((acc, r) => {
      const level = r.severity <= 2 ? 'เบา' : r.severity <= 3 ? 'ปานกลาง' : 'รุนแรง';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const symptomCounts = reports.reduce((acc, r) => {
      r.symptoms.forEach(symptom => {
        acc[symptom] = (acc[symptom] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const uniqueUsers = new Set(reports.map(r => r.userId)).size;
    const avgSeverity = reports.reduce((sum, r) => sum + r.severity, 0) / reports.length;
    const geographicSpread = new Set(reports.map(r => `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`)).size;

    // Top symptoms
    const topSymptoms = Object.entries(symptomCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => `${symptom}(${count})`);

    return `
รายงานทั้งหมด: ${reports.length} รายงาน จาก ${uniqueUsers} ผู้ใช้
พื้นที่: ${geographicSpread} จุดทางภูมิศาสตร์

ประเภทโรค: ${Object.entries(typeCounts).map(([k, v]) => `${k}(${v})`).join(', ')}

ระดับความรุนแรง:
${Object.entries(severityCounts).map(([k, v]) => `- ${k}: ${v} รายงาน (${((v/reports.length)*100).toFixed(1)}%)`).join('\n')}
ความรุนแรงเฉลี่ย: ${avgSeverity.toFixed(1)}/5

อาการที่พบบ่อยที่สุด: ${topSymptoms.join(', ')}
อาการทั้งหมด: ${Object.keys(symptomCounts).length} ประเภท`;
  }

  private summarizeBulkHealthStats(bulkStats: AnalysisData['bulkHealthStats']): string {
    if (bulkStats.length === 0) return 'ไม่มีสถิติสุขภาพจำนวนมาก';

    const totalCases = bulkStats.reduce((sum, stat) => sum + stat.caseCount, 0);
    const provinceCounts = bulkStats.reduce((acc, stat) => {
      acc[stat.province] = (acc[stat.province] || 0) + stat.caseCount;
      return acc;
    }, {} as Record<string, number>);

    const diseaseCounts = bulkStats.reduce((acc, stat) => {
      acc[stat.diseaseType] = (acc[stat.diseaseType] || 0) + stat.caseCount;
      return acc;
    }, {} as Record<string, number>);

    const ageGroupCounts = bulkStats.reduce((acc, stat) => {
      if (stat.ageGroup) {
        acc[stat.ageGroup] = (acc[stat.ageGroup] || 0) + stat.caseCount;
      }
      return acc;
    }, {} as Record<string, number>);

    const genderCounts = bulkStats.reduce((acc, stat) => {
      if (stat.gender) {
        acc[stat.gender] = (acc[stat.gender] || 0) + stat.caseCount;
      }
      return acc;
    }, {} as Record<string, number>);

    const topProvinces = Object.entries(provinceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const topDiseases = Object.entries(diseaseCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return `
ข้อมูลสถิติสุขภาพ: ${bulkStats.length} รายการ
ผู้ป่วยทั้งหมด: ${totalCases.toLocaleString()} ราย

จังหวัดที่มีผู้ป่วยมากที่สุด:
${topProvinces.map(([province, count], index) => 
  `${index + 1}. ${province}: ${count.toLocaleString()} ราย`).join('\n')}

โรคที่พบมากที่สุด:
${topDiseases.map(([disease, count], index) => 
  `${index + 1}. ${disease}: ${count.toLocaleString()} ราย`).join('\n')}

การกระจายตามเพศ: ${Object.entries(genderCounts).map(([gender, count]) => 
  `${gender}: ${count.toLocaleString()} ราย`).join(', ')}

การกระจายตามอายุ: ${Object.entries(ageGroupCounts).map(([age, count]) => 
  `${age}: ${count.toLocaleString()} ราย`).join(', ')}`;
  }

  private summarizeRiskAssessments(riskAssessments: AnalysisData['riskAssessments']): string {
    if (riskAssessments.length === 0) return 'ไม่มีการประเมินความเสี่ยงจากแพทย์';

    const riskLevelCounts = riskAssessments.reduce((acc, assessment) => {
      acc[assessment.riskLevel] = (acc[assessment.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgAge = riskAssessments.reduce((sum, a) => sum + a.patientAge, 0) / riskAssessments.length;
    
    const genderCounts = riskAssessments.reduce((acc, assessment) => {
      acc[assessment.patientGender] = (acc[assessment.patientGender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const symptomCounts = riskAssessments.reduce((acc, assessment) => {
      assessment.primarySymptoms.forEach(symptom => {
        acc[symptom] = (acc[symptom] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const avgSeverity = riskAssessments.reduce((sum, a) => sum + a.severity, 0) / riskAssessments.length;

    const topSymptoms = Object.entries(symptomCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return `
การประเมินความเสี่ยง: ${riskAssessments.length} ครั้ง
อายุเฉลี่ยผู้ป่วย: ${avgAge.toFixed(1)} ปี
ความรุนแรงเฉลี่ย: ${avgSeverity.toFixed(1)}/5

ระดับความเสี่ยง:
${Object.entries(riskLevelCounts).map(([level, count]) => 
  `- ${level}: ${count} ราย (${((count/riskAssessments.length)*100).toFixed(1)}%)`).join('\n')}

การกระจายตามเพศ: ${Object.entries(genderCounts).map(([gender, count]) => 
  `${gender}: ${count} ราย`).join(', ')}

อาการหลักที่พบ: ${topSymptoms.map(([symptom, count]) => 
  `${symptom}(${count})`).join(', ')}`;
  }

  private summarizeAIHealthChats(aiChats: AnalysisData['aiHealthChats']): string {
    if (aiChats.length === 0) return 'ไม่มีการปรึกษา AI ด้านสุขภาพ';

    const riskLevelCounts = aiChats.reduce((acc, chat) => {
      acc[chat.riskLevel] = (acc[chat.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const consultDoctorCount = aiChats.filter(chat => chat.shouldConsultDoctor).length;
    const avgMessageCount = aiChats.reduce((sum, chat) => sum + chat.messageCount, 0) / aiChats.length;

    const symptomCounts = aiChats.reduce((acc, chat) => {
      chat.suggestedSymptoms.forEach(symptom => {
        acc[symptom] = (acc[symptom] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topSymptoms = Object.entries(symptomCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return `
การปรึกษา AI: ${aiChats.length} ครั้ง
ข้อความเฉลี่ยต่อการปรึกษา: ${avgMessageCount.toFixed(1)} ข้อความ
แนะนำพบแพทย์: ${consultDoctorCount} ครั้ง (${((consultDoctorCount/aiChats.length)*100).toFixed(1)}%)

ระดับความเสี่ยงที่ AI ประเมิน:
${Object.entries(riskLevelCounts).map(([level, count]) => 
  `- ${level}: ${count} ครั้ง (${((count/aiChats.length)*100).toFixed(1)}%)`).join('\n')}

อาการที่ AI ระบุบ่อยที่สุด: ${topSymptoms.map(([symptom, count]) => 
  `${symptom}(${count})`).join(', ')}`;
  }

  private summarizeUserDemographics(demographics: AnalysisData['userDemographics']): string {
    const activeRate = ((demographics.activeUsers / demographics.totalUsers) * 100).toFixed(1);

    return `
ข้อมูลผู้ใช้งาน:
- ผู้ใช้ทั้งหมด: ${demographics.totalUsers.toLocaleString()} คน
- ผู้ใช้ที่มีกิจกรรม (30 วัน): ${demographics.activeUsers.toLocaleString()} คน (${activeRate}%)

การกระจายตามบทบาท:
${Object.entries(demographics.usersByRole).map(([role, count]) => 
  `- ${role}: ${count.toLocaleString()} คน (${((count/demographics.totalUsers)*100).toFixed(1)}%)`).join('\n')}

การกระจายตามจังหวัด:
${Object.entries(demographics.usersByProvince).map(([province, count]) => 
  `- ${province}: ${count.toLocaleString()} คน`).join('\n')}`;
  }

  private summarizeHistoricalTrends(trends: AnalysisData['historicalTrends']): string {
    const weatherTrends = trends.weatherTrends.filter(t => t.dataPoints > 0);
    const healthTrends = trends.healthTrends.filter(t => t.reportCount > 0);

    if (weatherTrends.length === 0 && healthTrends.length === 0) {
      return 'ไม่มีข้อมูลแนวโน้มทางประวัติศาสตร์';
    }

    const recentWeather = weatherTrends.slice(-7); // Last 7 days with data
    const recentHealth = healthTrends.slice(-7);

    const avgPM25Trend = recentWeather.length > 0 
      ? recentWeather.reduce((sum, t) => sum + (t.avgPM25 || 0), 0) / recentWeather.length 
      : 0;

    const avgHealthReportsTrend = recentHealth.length > 0 
      ? recentHealth.reduce((sum, t) => sum + t.reportCount, 0) / recentHealth.length 
      : 0;

    // Calculate trend direction
    const pm25Direction = recentWeather.length >= 2 
      ? (recentWeather[recentWeather.length - 1].avgPM25 || 0) - (recentWeather[0].avgPM25 || 0)
      : 0;

    const healthDirection = recentHealth.length >= 2 
      ? recentHealth[recentHealth.length - 1].reportCount - recentHealth[0].reportCount
      : 0;

    return `
แนวโน้มสิ่งแวดล้อม (7 วันล่าสุด):
- PM2.5 เฉลี่ย: ${avgPM25Trend.toFixed(1)}μg/m³ (${pm25Direction > 0 ? 'เพิ่มขึ้น' : pm25Direction < 0 ? 'ลดลง' : 'คงที่'} ${Math.abs(pm25Direction).toFixed(1)})
- จำนวนจุดวัดเฉลี่ย: ${(recentWeather.reduce((sum, t) => sum + t.dataPoints, 0) / recentWeather.length).toFixed(0)} จุดต่อวัน

แนวโน้มสุขภาพ (7 วันล่าสุด):
- รายงานสุขภาพเฉลี่ย: ${avgHealthReportsTrend.toFixed(1)} รายงานต่อวัน
- แนวโน้ม: ${healthDirection > 0 ? 'เพิ่มขึ้น' : healthDirection < 0 ? 'ลดลง' : 'คงที่'} ${Math.abs(healthDirection).toFixed(1)} รายงาน

ข้อมูลครอบคลุม ${weatherTrends.length} วันสำหรับสิ่งแวดล้อม และ ${healthTrends.length} วันสำหรับสุขภาพ`;
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
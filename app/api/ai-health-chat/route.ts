import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/ai-health-chat - Create or continue AI health chat
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { message, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Generate AI response
    const aiResponse = await generateHealthResponse(message, session.user.id);
    
    // Create or update chat session
    const chatSession = await prisma.aIHealthChat.upsert({
      where: {
        userId_sessionId: {
          userId: session.user.id,
          sessionId: sessionId || generateSessionId()
        }
      },
      update: {
        messages: {
          push: [
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: aiResponse.response, timestamp: new Date().toISOString() }
          ]
        },
        suggestedSymptoms: aiResponse.symptoms,
        riskLevel: aiResponse.riskLevel,
        recommendation: aiResponse.recommendation,
        shouldConsultDoctor: aiResponse.shouldConsultDoctor,
        needsMoreInfo: aiResponse.needsMoreInfo,
        missingInfo: aiResponse.missingInfo,
        updatedAt: new Date()
      },
      create: {
        userId: (session.user as any).id,
        sessionId: sessionId || generateSessionId(),
        messages: [
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: aiResponse.response, timestamp: new Date().toISOString() }
        ],
        suggestedSymptoms: aiResponse.symptoms,
        riskLevel: aiResponse.riskLevel,
        recommendation: aiResponse.recommendation,
        shouldConsultDoctor: aiResponse.shouldConsultDoctor,
        needsMoreInfo: aiResponse.needsMoreInfo,
        missingInfo: aiResponse.missingInfo
      }
    });

    return NextResponse.json({
      sessionId: chatSession.sessionId,
      response: aiResponse.response,
      symptoms: aiResponse.symptoms,
      riskLevel: aiResponse.riskLevel,
      recommendation: aiResponse.recommendation,
      shouldConsultDoctor: aiResponse.shouldConsultDoctor,
      needsMoreInfo: aiResponse.needsMoreInfo,
      missingInfo: aiResponse.missingInfo
    });

  } catch (error) {
    console.error('AI health chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process health chat' },
      { status: 500 }
    );
  }
}

// GET /api/ai-health-chat - Get chat history
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
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Get specific session
      const chatSession = await prisma.aIHealthChat.findFirst({
        where: {
          userId: session.user.id,
          sessionId: sessionId
        }
      });

      return NextResponse.json({ chatSession });
    } else {
      // Get all sessions for user
      const chatSessions = await prisma.aIHealthChat.findMany({
        where: {
          userId: (session.user as any).id
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10
      });

      return NextResponse.json({ chatSessions });
    }

  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

async function generateHealthResponse(message: string, userId: string) {
  try {
    // Get user context and environmental data
    const userContext = await getUserHealthContext(userId);
    const environmentalContext = await getCurrentEnvironmentalContext(userContext.userLocation);
    
    const prompt = `คุณเป็นผู้ช่วยด้านสุขภาพที่ฉลาดและเป็นมิตร โปรดวิเคราะห์อาการที่ผู้ป่วยอธิบาย และให้คำแนะนำเบื้องต้น

ข้อความจากผู้ป่วย: "${message}"

ข้อมูลบริบทของผู้ป่วย:
${userContext.summary}

สภาพแวดล้อมปัจจุบันในพื้นที่:
${environmentalContext}

ก่อนให้คำแนะนำ หากผู้ป่วยยังไม่ได้ระบุโรคประจำตัวหรือประวัติการเจ็บป่วย กรุณาถามข้อมูลเพิ่มเติมเหล่านี้:
1. โรคประจำตัวที่มีอยู่ (เช่น เบาหวาน, ความดันสูง, โรคหัวใจ, โรคไต, โรคแพ้, เป็นต้น)
2. ยาที่กินประจำ (ถ้ามี)
3. ประวัติการแพ้ยาหรือสารต่างๆ (ถ้ามี)
4. ระยะเวลาที่มีอาการ
5. ความรุนแรงของอาการ (1-10)

**สำคัญ**: พิจารณาสภาพแวดล้อมปัจจุบันในการให้คำแนะนำ หากมีค่าฝุ่น PM2.5 สูง ให้เน้นความเสี่ยงต่อระบบทางเดินหายใจ หากอุณหภูมิสูง ให้เตือนเรื่องภาวะขาดน้ำ

โปรดตอบกลับในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "response": "การตอบกลับที่เป็นมิตรและให้ข้อมูลในภาษาไทย รวมถึงคำแนะนำเกี่ยวกับสภาพแวดล้อมและคำถามเพิ่มเติมเกี่ยวกับโรคประจำตัวหากจำเป็น",
  "symptoms": ["อาการที่ 1", "อาการที่ 2"],
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendation": "SELF_CARE|TELEHEALTH|CLINIC_VISIT|EMERGENCY",
  "shouldConsultDoctor": true/false,
  "needsMoreInfo": true/false,
  "missingInfo": ["โรคประจำตัว", "ยาที่กิน", "ประวัติการแพ้", "ระยะเวลาอาการ", "ความรุนแรง"],
  "environmentalFactors": ["ปัจจัยสิ่งแวดล้อมที่เกี่ยวข้อง"]
}

หลักเกณฑ์การประเมิน:
- LOW: อาการเล็กน้อย ดูแลตนเองได้
- MEDIUM: อาการปานกลาง ควรสังเกต  
- HIGH: อาการค่อนข้างรุนแรง ควรพบแพทย์
- CRITICAL: อาการรุนแรง ต้องรีบพบแพทย์

โปรดให้คำแนะนำที่ปลอดภัยและไม่ใช่การวินิจฉัยทางการแพทย์ 
หากข้อมูลไม่เพียงพอ ให้ถามข้อมูลเพิ่มเติมเพื่อการวิเคราะห์ที่แม่นยำกว่า`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'คุณเป็นผู้ช่วยด้านสุขภาพที่ให้คำแนะนำเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponseText = data.choices[0]?.message?.content;

    if (!aiResponseText) {
      throw new Error('No response from AI');
    }

    // Try to parse JSON response
    let parsedResponse;
    try {
      // Extract JSON from response if it's wrapped in markdown or other text
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(aiResponseText);
      }
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.warn('Failed to parse AI response as JSON:', parseError);
      parsedResponse = {
        response: aiResponseText,
        symptoms: extractSymptomsFromText(message),
        riskLevel: 'MEDIUM',
        recommendation: 'TELEHEALTH',
        shouldConsultDoctor: true,
        needsMoreInfo: true,
        missingInfo: ['โรคประจำตัว', 'ประวัติการเจ็บป่วย']
      };
    }

    // Validate and set defaults
    return {
      response: parsedResponse.response || 'ขออพัยในความไม่สะดวก กรุณาลองใหม่อีกครั้ง',
      symptoms: Array.isArray(parsedResponse.symptoms) ? parsedResponse.symptoms : [],
      riskLevel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsedResponse.riskLevel) 
        ? parsedResponse.riskLevel : 'MEDIUM',
      recommendation: ['SELF_CARE', 'TELEHEALTH', 'CLINIC_VISIT', 'EMERGENCY'].includes(parsedResponse.recommendation)
        ? parsedResponse.recommendation : 'TELEHEALTH',
      shouldConsultDoctor: Boolean(parsedResponse.shouldConsultDoctor),
      needsMoreInfo: Boolean(parsedResponse.needsMoreInfo),
      missingInfo: Array.isArray(parsedResponse.missingInfo) ? parsedResponse.missingInfo : [],
      environmentalFactors: Array.isArray(parsedResponse.environmentalFactors) ? parsedResponse.environmentalFactors : []
    };

  } catch (error) {
    console.error('AI response generation error:', error);
    
    // Fallback response
    return {
      response: 'ขออพัยในความไม่สะดวก ระบบ AI กำลังมีปัญหา กรุณาติดต่อแพทย์โดยตรงหากมีอาการที่กังวล',
      symptoms: extractSymptomsFromText(message),
      riskLevel: 'MEDIUM',
      recommendation: 'TELEHEALTH',
      shouldConsultDoctor: true,
      needsMoreInfo: true,
      missingInfo: ['โรคประจำตัว', 'ประวัติการเจ็บป่วย'],
      environmentalFactors: []
    };
  }
}

function extractSymptomsFromText(text: string): string[] {
  const commonSymptoms = [
    'ไข้', 'ปวดหัว', 'ไอ', 'จาม', 'เจ็บคอ', 'ปวดกล้ามเนื้อ', 'เหนื่อยง่าย',
    'คลื่นไส้', 'อาเจียน', 'ท้องเสียส', 'ปวดท้อง', 'ปวดอก', 'หายใจลำบาก',
    'วิงเวียน', 'เวียนศีรษะ', 'ผื่น', 'คัน', 'บวม', 'ปวดข้อ'
  ];

  const symptoms: string[] = [];
  const lowerText = text.toLowerCase();
  
  commonSymptoms.forEach(symptom => {
    if (lowerText.includes(symptom)) {
      symptoms.push(symptom);
    }
  });

  return symptoms;
}

async function getUserHealthContext(userId: string) {
  try {
    // Get user's basic info and location
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        homeLatitude: true,
        homeLongitude: true,
        homeAddress: true,
        createdAt: true,
      }
    });

    // Get user's recent health reports (last 30 days)
    const recentReports = await prisma.report.findMany({
      where: {
        userId: userId,
        reportDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        type: true,
        severity: true,
        symptoms: true,
        reportDate: true,
      },
      orderBy: {
        reportDate: 'desc'
      },
      take: 10
    });

    // Get user's recent AI health chats
    const recentChats = await prisma.aIHealthChat.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        riskLevel: true,
        suggestedSymptoms: true,
        shouldConsultDoctor: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Get user's risk assessments
    const riskAssessments = await prisma.riskAssessment.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        riskLevel: true,
        primarySymptoms: true,
        severity: true,
        patientAge: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });

    // Build context summary
    const userLocation = user?.homeLatitude && user?.homeLongitude 
      ? { lat: user.homeLatitude, lng: user.homeLongitude }
      : null;

    const recentSymptoms = new Set();
    recentReports.forEach(report => {
      report.symptoms.forEach(symptom => recentSymptoms.add(symptom));
    });

    const summary = `
ข้อมูลผู้ใช้:
- สมาชิกตั้งแต่: ${user?.createdAt.toLocaleDateString('th-TH')}
- ที่อยู่: ${user?.homeAddress || 'ไม่ระบุ'}

ประวัติสุขภาพล่าสุด (30 วัน):
- รายงานสุขภาพ: ${recentReports.length} รายงาน
- อาการที่เคยมี: ${Array.from(recentSymptoms).join(', ') || 'ไม่มีข้อมูล'}
- การปรึกษา AI: ${recentChats.length} ครั้ง
- การประเมินความเสี่ยง: ${riskAssessments.length} ครั้ง

${recentReports.length > 0 ? `รายงานล่าสุด:
${recentReports.slice(0, 3).map(r => 
  `- ${r.reportDate.toLocaleDateString('th-TH')}: ${r.type} (ความรุนแรง ${r.severity}/5)`
).join('\n')}` : ''}`;

    return {
      userLocation,
      recentReports,
      recentChats,
      riskAssessments,
      summary
    };
  } catch (error) {
    console.error('Error getting user health context:', error);
    return {
      userLocation: null,
      recentReports: [],
      recentChats: [],
      riskAssessments: [],
      summary: 'ไม่สามารถโหลดข้อมูลประวัติสุขภาพได้'
    };
  }
}

async function getCurrentEnvironmentalContext(userLocation: { lat: number, lng: number } | null) {
  try {
    if (!userLocation) {
      return 'ไม่มีข้อมูลที่อยู่สำหรับการวิเคราะห์สภาพแวดล้อม';
    }

    // Get nearby weather data (within ~5km radius)
    const nearbyWeather = await prisma.weatherData.findMany({
      where: {
        recordedAt: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
        },
        latitude: {
          gte: userLocation.lat - 0.05,
          lte: userLocation.lat + 0.05
        },
        longitude: {
          gte: userLocation.lng - 0.05,
          lte: userLocation.lng + 0.05
        }
      },
      orderBy: {
        recordedAt: 'desc'
      },
      take: 5
    });

    if (nearbyWeather.length === 0) {
      return 'ไม่มีข้อมูลสภาพแวดล้อมในพื้นที่ใกล้เคียง';
    }

    const latestReading = nearbyWeather[0];
    const pm25 = latestReading.pm25;
    const aqi = latestReading.aqi;
    const temp = latestReading.temperature;
    const humidity = latestReading.humidity;

    let airQualityLevel = 'ปานกลาง';
    let healthRisk = 'ปกติ';

    if (pm25) {
      if (pm25 > 75) {
        airQualityLevel = 'อันตราย';
        healthRisk = 'สูงมาก - หลีกเลี่ยงกิจกรรมกลางแจ้ง';
      } else if (pm25 > 55) {
        airQualityLevel = 'ไม่เหมาะสำหรับสุขภาพ';
        healthRisk = 'สูง - ลดกิจกรรมกลางแจ้ง';
      } else if (pm25 > 35) {
        airQualityLevel = 'ปานกลาง';
        healthRisk = 'ปานกลาง - กลุ่มเสี่ยงควรระวัง';
      } else {
        airQualityLevel = 'ดี';
        healthRisk = 'ต่ำ';
      }
    }

    return `
สภาพแวดล้อมปัจจุบันในพื้นที่ (อัปเดตล่าสุด: ${latestReading.recordedAt.toLocaleString('th-TH')}):
- ค่าฝุ่น PM2.5: ${pm25?.toFixed(1) || 'ไม่มีข้อมูล'} μg/m³ (ระดับ: ${airQualityLevel})
- คุณภาพอากาศ AQI: ${aqi || 'ไม่มีข้อมูล'}
- อุณหภูมิ: ${temp?.toFixed(1) || 'ไม่มีข้อมูล'}°C
- ความชื้น: ${humidity?.toFixed(0) || 'ไม่มีข้อมูล'}%
- ความเสี่ยงต่อสุขภาพ: ${healthRisk}
- สถานี: ${latestReading.stationName || 'ไม่ระบุ'}

${pm25 && pm25 > 55 ? '⚠️ คำเตือน: ค่าฝุ่นสูง อาจส่งผลต่อระบบทางเดินหายใจ' : ''}
${temp && temp > 35 ? '🌡️ คำเตือน: อุณหภูมิสูง ควรดื่มน้ำเพิ่มและหลีกเลี่ยงแสงแดด' : ''}`;

  } catch (error) {
    console.error('Error getting environmental context:', error);
    return 'เกิดข้อผิดพลาดในการโหลดข้อมูลสภาพแวดล้อม';
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
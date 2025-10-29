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
    const aiResponse = await generateHealthResponse(message);
    
    // Create or update chat session
    const chatSession = await prisma.AIHealthChat.upsert({
      where: {
        userId_sessionId: {
          userId: (session.user as any).id,
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
      const chatSession = await prisma.AIHealthChat.findFirst({
        where: {
          userId: (session.user as any).id,
          sessionId: sessionId
        }
      });

      return NextResponse.json({ chatSession });
    } else {
      // Get all sessions for user
      const chatSessions = await prisma.AIHealthChat.findMany({
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

async function generateHealthResponse(message: string) {
  try {
    const prompt = `คุณเป็นผู้ช่วยด้านสุขภาพที่ฉลาดและเป็นมิตร โปรดวิเคราะห์อาการที่ผู้ป่วยอธิบาย และให้คำแนะนำเบื้องต้น

ข้อความจากผู้ป่วย: "${message}"

ก่อนให้คำแนะนำ หากผู้ป่วยยังไม่ได้ระบุโรคประจำตัวหรือประวัติการเจ็บป่วย กรุณาถามข้อมูลเพิ่มเติมเหล่านี้:
1. โรคประจำตัวที่มีอยู่ (เช่น เบาหวาน, ความดันสูง, โรคหัวใจ, โรคไต, โรคแพ้, เป็นต้น)
2. ยาที่กินประจำ (ถ้ามี)
3. ประวัติการแพ้ยาหรือสารต่างๆ (ถ้ามี)
4. ระยะเวลาที่มีอาการ
5. ความรุนแรงของอาการ (1-10)

โปรดตอบกลับในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "response": "การตอบกลับที่เป็นมิตรและให้ข้อมูลในภาษาไทย รวมถึงคำถามเพิ่มเติมเกี่ยวกับโรคประจำตัวหากจำเป็น",
  "symptoms": ["อาการที่ 1", "อาการที่ 2"],
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendation": "SELF_CARE|TELEHEALTH|CLINIC_VISIT|EMERGENCY",
  "shouldConsultDoctor": true/false,
  "needsMoreInfo": true/false,
  "missingInfo": ["โรคประจำตัว", "ยาที่กิน", "ประวัติการแพ้", "ระยะเวลาอาการ", "ความรุนแรง"]
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
      missingInfo: Array.isArray(parsedResponse.missingInfo) ? parsedResponse.missingInfo : []
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
      missingInfo: ['โรคประจำตัว', 'ประวัติการเจ็บป่วย']
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

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
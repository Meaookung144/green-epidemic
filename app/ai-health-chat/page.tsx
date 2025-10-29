'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  suggestedSymptoms: string[];
  riskLevel?: string;
  recommendation?: string;
  shouldConsultDoctor: boolean;
  needsMoreInfo?: boolean;
  missingInfo?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AIHealthChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const illnessCategories = [
    {
      category: "โรคระบบทางเดินหายใจ",
      icon: "🫁",
      symptoms: ["ไข้", "ไอ", "เจ็บคอ", "น้ำมูก", "หายใจลำบาก"],
      examples: ["ไข้หวัด", "ไข้หวัดใหญ่", "โควิด-19", "โรคปอดบวม"]
    },
    {
      category: "โรคระบบทางเดินอาหาร",
      icon: "🤢",
      symptoms: ["ปวดท้อง", "ท้องเสีย", "คลื่นไส้", "อาเจียน", "ท้องผูก"],
      examples: ["อาหารเป็นพิษ", "โรคกระเพาะ", "โรคลำไส้"]
    },
    {
      category: "โรคผิวหนังและอาการแพ้",
      icon: "🔴",
      symptoms: ["ผื่นคัน", "บวม", "ผิวแดง", "ลมพิษ", "ผื่นแสง"],
      examples: ["แพ้อาหาร", "แพ้ยา", "โรคผิวหนัง", "แพ้สารเคมี"]
    },
    {
      category: "โรคกระดูกและข้อ",
      icon: "🦴",
      symptoms: ["ปวดข้อ", "บวม", "ข้อแข็ง", "เดินลำบาก", "ปวดหลัง"],
      examples: ["ข้ออักเสบ", "โรคเก๊าท์", "ปวดหลัง", "บาดเจ็บ"]
    },
    {
      category: "โรคหัวใจและหลอดเลือด",
      icon: "❤️",
      symptoms: ["เจ็บหน้าอก", "หายใจลำบาก", "วิงเวียน", "เหนื่อยง่าย"],
      examples: ["ความดันสูง", "โรคหัวใจ", "หลอดเลือดตีบ"]
    },
    {
      category: "โรคระบบประสาทและจิตเวช",
      icon: "🧠",
      symptoms: ["ปวดหัว", "วิงเวียน", "นอนไม่หลับ", "เครียด", "ซึมเศร้า"],
      examples: ["ไมเกรน", "โรคซึมเศร้า", "โรควิตกกังวล"]
    }
  ];

  const quickQuestions = [
    "ฉันมีไข้และปวดหัว ควรทำอย่างไร?",
    "อาการไอและเจ็บคอมาหลายวันแล้ว",
    "รู้สึกเหนื่อยง่ายและอ่อนเพลีย",
    "ปวดท้องและท้องเสียเป็นระยะ",
    "มีผื่นคันตามตัว ไม่ทราบสาเหตุ",
    "หายใจลำบากและเหนื่อยง่าย"
  ];

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    fetchChatSessions();
  }, [status, session, router]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatSessions = async () => {
    try {
      const response = await fetch('/api/ai-health-chat');
      if (response.ok) {
        const data = await response.json();
        setChatSessions(data.chatSessions || []);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  };

  const startNewSession = () => {
    setCurrentSession(null);
    setMessage('');
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSession(session);
    setShowSessions(false);
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    const userMessage = message;
    setMessage('');

    try {
      // Add user message to current session immediately
      if (currentSession) {
        const newUserMessage: ChatMessage = {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString()
        };
        setCurrentSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newUserMessage]
        } : null);
      }

      const response = await fetch('/api/ai-health-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSession?.sessionId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update or create session with AI response
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };

        if (currentSession) {
          setCurrentSession(prev => prev ? {
            ...prev,
            messages: [...prev.messages, aiMessage],
            suggestedSymptoms: data.symptoms,
            riskLevel: data.riskLevel,
            recommendation: data.recommendation,
            shouldConsultDoctor: data.shouldConsultDoctor,
            needsMoreInfo: data.needsMoreInfo,
            missingInfo: data.missingInfo
          } : null);
        } else {
          // Create new session
          const newSession: ChatSession = {
            id: Date.now().toString(),
            sessionId: data.sessionId,
            messages: [
              { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
              aiMessage
            ],
            suggestedSymptoms: data.symptoms,
            riskLevel: data.riskLevel,
            recommendation: data.recommendation,
            shouldConsultDoctor: data.shouldConsultDoctor,
            needsMoreInfo: data.needsMoreInfo,
            missingInfo: data.missingInfo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setCurrentSession(newSession);
        }

        // Generate preliminary diagnosis
        if (data.riskLevel && data.symptoms) {
          const prelimDiagnosis = generatePreliminaryDiagnosis(data.symptoms, data.riskLevel);
          
          // Show preliminary diagnosis notification
          if (data.riskLevel === 'HIGH' || data.riskLevel === 'CRITICAL') {
            toast.error(`🩺 วินิจฉัยเบื้องต้น: ${prelimDiagnosis.diagnosis}`, {
              duration: 6000
            });
          } else if (data.riskLevel === 'MEDIUM') {
            toast((t) => (
              <div className="text-sm">
                <div className="font-medium text-yellow-800">🩺 วินิจฉัยเบื้องต้น:</div>
                <div className="mt-1">{prelimDiagnosis.diagnosis}</div>
              </div>
            ), {
              duration: 5000,
              style: {
                background: '#fef3c7',
                color: '#92400e',
              },
            });
          }
        }
        
        // Show doctor consultation recommendation if needed
        if (data.shouldConsultDoctor) {
          toast.success('🏥 AI แนะนำให้ปรึกษาแพทย์ คุณสามารถจองการปรึกษาทางไกลได้', {
            duration: 5000
          });
        }
        
        fetchChatSessions(); // Refresh sessions list
      } else {
        toast.error('เกิดข้อผิดพลาดในการส่งข้อความ');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('เกิดข้อผิดพลาดในการติดต่อ AI');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectQuickQuestion = (question: string) => {
    setMessage(question);
    setShowQuickQuestions(false);
  };

  const generatePreliminaryDiagnosis = (symptoms: string[], riskLevel: string, category?: string) => {
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      return {
        diagnosis: 'อาการที่ต้องได้รับการตรวจจากแพทย์โดยเร็ว',
        recommendation: 'แนะนำให้ปรึกษาแพทย์ทางไกลหรือไปพบแพทย์ในคลินิกโดยเร็ว',
        urgency: 'สูง'
      };
    } else if (riskLevel === 'MEDIUM') {
      return {
        diagnosis: 'อาการเบื้องต้นที่ควรติดตาม',
        recommendation: 'แนะนำให้ปรึกษาแพทย์ทางไกลเพื่อประเมินเพิ่มเติม',
        urgency: 'ปานกลาง'
      };
    } else {
      return {
        diagnosis: 'อาการเบื้องต้นที่สามารถดูแลตนเองได้',
        recommendation: 'ดูแลตนเองและติดตามอาการ หากอาการไม่ดีขึ้นให้ปรึกษาแพทย์',
        urgency: 'ต่ำ'
      };
    }
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRecommendationText = (recommendation?: string) => {
    switch (recommendation) {
      case 'SELF_CARE': return 'ดูแลตนเอง';
      case 'TELEHEALTH': return 'ปรึกษาแพทย์ทางไกล';
      case 'CLINIC_VISIT': return 'ไปพบแพทย์';
      case 'EMERGENCY': return 'ฉุกเฉิน';
      default: return recommendation;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto flex h-screen">
        {/* Sidebar - Chat Sessions */}
        <div className={`${showSessions ? 'block' : 'hidden'} md:block w-80 bg-white border-r border-gray-200 flex flex-col`}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">🤖 ที่ปรึกษาสุขภาพ AI</h2>
            <button
              onClick={startNewSession}
              className="mt-2 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
            >
              + เริ่มการสนทนาใหม่
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">การสนทนาก่อนหน้า</h3>
            {chatSessions.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                <p>ยังไม่มีการสนทนาก่อนหน้า</p>
                <p className="mt-1">เริ่มแชทใหม่เพื่อรับคำแนะนำด้านสุขภาพ</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session)}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      currentSession?.sessionId === session.sessionId
                        ? 'bg-green-50 border-green-200 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {session.messages[0]?.content.slice(0, 30)}...
                      </span>
                      {session.shouldConsultDoctor && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          แพทย์
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                    {session.riskLevel && (
                      <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${getRiskLevelColor(session.riskLevel)}`}>
                        {session.riskLevel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ผู้ช่วยด้านสุขภาพ AI</h1>
              <p className="text-sm text-gray-600">อธิบายอาการของคุณและรับคำแนะนำเบื้องต้นด้านสุขภาพ</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="md:hidden bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                💬 ประวัติ
              </button>
              {currentSession?.shouldConsultDoctor && (
                <a
                  href="/telemedicine"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  👨‍⚕️ ปรึกษาแพทย์
                </a>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!currentSession ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">ยินดีต้อนรับสู่ที่ปรึกษาสุขภาพ AI</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  ฉันพร้อมช่วยวิเคราะห์อาการและให้คำแนะนำเบื้องต้นด้านสุขภาพ 
                  กรุณาอธิบายอาการที่คุณกำลังประสบอยู่
                </p>
                
                {/* Illness Categories */}
                {!currentSession && (
                  <div className="max-w-4xl mx-auto mb-6">
                    <h4 className="text-lg font-medium text-gray-800 mb-4 text-center">🩺 เลือกประเภทอาการที่คุณกำลังประสบ:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {illnessCategories.map((category, index) => (
                        <div
                          key={index}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                          onClick={() => {
                            setMessage(`ฉันมีอาการเกี่ยวกับ${category.category} โดยเฉพาะ ${category.symptoms.slice(0, 3).join(', ')} กรุณาช่วยประเมินสภาพของฉัน`);
                            setShowQuickQuestions(false);
                          }}
                        >
                          <div className="text-center">
                            <div className="text-3xl mb-2">{category.icon}</div>
                            <h5 className="font-medium text-gray-900 mb-2">{category.category}</h5>
                            <div className="text-xs text-gray-600 mb-2">
                              <div className="font-medium mb-1">อาการทั่วไป:</div>
                              <div className="flex flex-wrap gap-1 justify-center">
                                {category.symptoms.slice(0, 3).map((symptom, i) => (
                                  <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {symptom}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-xs text-blue-600">
                              ตัวอย่าง: {category.examples.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Quick Question Buttons */}
                {showQuickQuestions && !currentSession && (
                  <div className="max-w-2xl mx-auto mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">หรือเลือกคำถามที่พบบ่อย:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quickQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => selectQuickQuestion(question)}
                          className="text-left p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition text-sm text-blue-800"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-yellow-800 text-sm">
                    <strong>ข้อสำคัญ:</strong> ข้อมูลนี้ไม่ใช่การวินิจฉัยทางการแพทย์ 
                    โปรดปรึกษาแพทย์เสมอหากมีอาการที่กังวลหรือรุนแรง
                  </p>
                </div>
              </div>
            ) : (
              <>
                {currentSession.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-green-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.role === 'user' ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Missing Information Request */}
                {currentSession.needsMoreInfo && currentSession.missingInfo && currentSession.missingInfo.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-2">📋 AI ต้องการข้อมูลเพิ่มเติมเพื่อการวิเคราะห์ที่แม่นยำ</h4>
                    <p className="text-amber-800 text-sm mb-3">
                      กรุณาให้ข้อมูลเพิ่มเติมเพื่อให้ AI สามารถวิเคราะห์และให้คำแนะนำที่เหมาะสมกับสภาพของคุณ:
                    </p>
                    <div className="space-y-2">
                      {currentSession.missingInfo.map((info, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                          <span className="text-sm text-amber-900">{info}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Quick response buttons for common missing info */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setMessage("ฉันไม่มีโรคประจำตัว และไม่ได้กินยาประจำ")}
                        className="text-left p-2 bg-white border border-amber-300 rounded hover:bg-amber-50 transition text-xs text-amber-900"
                      >
                        ไม่มีโรคประจำตัว/ไม่กินยา
                      </button>
                      <button
                        onClick={() => setMessage("ฉันมีอาการมา 2-3 วันแล้ว ความรุนแรงระดับ 6/10")}
                        className="text-left p-2 bg-white border border-amber-300 rounded hover:bg-amber-50 transition text-xs text-amber-900"
                      >
                        มีอาการ 2-3 วัน ระดับ 6/10
                      </button>
                      <button
                        onClick={() => setMessage("ฉันเป็นเบาหวาน และกินยาเมตฟอร์มิน")}
                        className="text-left p-2 bg-white border border-amber-300 rounded hover:bg-amber-50 transition text-xs text-amber-900"
                      >
                        มีโรคเบาหวาน
                      </button>
                      <button
                        onClick={() => setMessage("ฉันมีความดันสูง และกินยาลดความดัน")}
                        className="text-left p-2 bg-white border border-amber-300 rounded hover:bg-amber-50 transition text-xs text-amber-900"
                      >
                        มีความดันสูง
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Analysis Summary */}
                {currentSession.riskLevel && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">🔍 สรุปการวิเคราะห์จาก AI</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">ระดับความเสี่ยง:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getRiskLevelColor(currentSession.riskLevel)}`}>
                          {currentSession.riskLevel}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">คำแนะนำ:</span>
                        <span className="ml-2 text-blue-900">
                          {getRecommendationText(currentSession.recommendation)}
                        </span>
                      </div>
                    </div>
                    {currentSession.suggestedSymptoms.length > 0 && (
                      <div className="mt-3">
                        <span className="text-blue-700 font-medium text-sm">อาการที่ระบุได้:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {currentSession.suggestedSymptoms.map((symptom, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Preliminary Diagnosis */}
                    {currentSession.riskLevel && (
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <h5 className="font-medium text-blue-900 mb-2">🩺 วินิจฉัยเบื้องต้นจาก AI:</h5>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                          {(() => {
                            const diagnosis = generatePreliminaryDiagnosis(
                              currentSession.suggestedSymptoms, 
                              currentSession.riskLevel
                            );
                            return (
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium text-blue-800">การวินิจฉัย:</span>
                                  <span className="ml-2 text-blue-900">{diagnosis.diagnosis}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-blue-800">คำแนะนำ:</span>
                                  <span className="ml-2 text-blue-900">{diagnosis.recommendation}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-blue-800">ระดับความเร่งด่วน:</span>
                                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                    diagnosis.urgency === 'สูง' ? 'bg-red-100 text-red-800' :
                                    diagnosis.urgency === 'ปานกลาง' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {diagnosis.urgency}
                                  </span>
                                </div>
                              </div>
                            );
                          })()} 
                        </div>
                      </div>
                    )}
                    
                    {/* Doctor Consultation Button */}
                    {currentSession.shouldConsultDoctor && (
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <div className="mb-2">
                          <span className="text-sm font-medium text-blue-800">🏥 ส่งข้อมูลการวินิจฉัยให้แพทย์:</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <a
                            href={`/telemedicine?diagnosis=${encodeURIComponent(JSON.stringify({
                              symptoms: currentSession.suggestedSymptoms,
                              riskLevel: currentSession.riskLevel,
                              preliminary: generatePreliminaryDiagnosis(currentSession.suggestedSymptoms, currentSession.riskLevel),
                              chatHistory: currentSession.messages.map(m => ({ role: m.role, content: m.content }))
                            }))}`}
                            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            👨‍⚕️ ส่งข้อมูลและจองปรึกษาแพทย์
                          </a>
                          <a
                            href="/risk-assessment"
                            className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                          >
                            🏥 ทำแบบประเมินความเสี่ยง
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="อธิบายอาการของคุณ รวมถึงโรคประจำตัว และยาที่กิน... (เช่น 'ฉันมีไข้และปวดหัวมา 2 วันแล้ว ฉันเป็นเบาหวานและกินยาเมตฟอร์มิน')"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500 resize-none"
                rows={2}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition self-end"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  'ส่ง'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              กด Enter เพื่อส่งข้อความ • AI ให้คำแนะนำเบื้องต้นเท่านั้น โปรดปรึกษาแพทย์หากมีอาการรุนแรง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
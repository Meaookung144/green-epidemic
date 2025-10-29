'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface TelemedConsultation {
  id: string;
  riskAssessmentId: string;
  patientId: string;
  doctorId?: string;
  status: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  roomId?: string;
  callUrl?: string;
  chiefComplaint?: string;
  doctorNotes?: string;
  diagnosis?: string;
  prescription?: string;
  followUpNotes?: string;
  followUpDate?: string;
  createdAt: string;
  doctor?: {
    name: string;
    email: string;
  };
  patient?: {
    name: string;
    email: string;
  };
  riskAssessment?: {
    patientName: string;
    primarySymptoms: string[];
    riskLevel: string;
    recommendation: string;
  };
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

export default function TelemedicinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<TelemedConsultation[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<TelemedConsultation | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'available'>('upcoming');
  const [aiDiagnosisData, setAiDiagnosisData] = useState<any>(null);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    chiefComplaint: '',
    scheduledDate: '',
    scheduledTime: '',
    selectedDoctorId: ''
  });

  // Complete consultation form state
  const [completeForm, setCompleteForm] = useState({
    doctorNotes: '',
    diagnosis: '',
    prescription: '',
    followUpNotes: '',
    followUpDate: ''
  });

  const userRole = (session?.user as any)?.role;
  const isDoctor = userRole === 'DOCTOR';
  const isPatient = !isDoctor;

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    // Check for AI diagnosis data from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const diagnosisParam = urlParams.get('diagnosis');
    if (diagnosisParam) {
      try {
        const diagnosisData = JSON.parse(decodeURIComponent(diagnosisParam));
        setAiDiagnosisData(diagnosisData);
        setShowBookingModal(true);
        // Set chief complaint from AI diagnosis
        setBookingForm(prev => ({
          ...prev,
          chiefComplaint: `วินิจฉัยเบื้องต้นจาก AI: ${diagnosisData.preliminary?.diagnosis || ''}\n\nอาการที่ระบุ: ${diagnosisData.symptoms?.join(', ') || ''}\n\nระดับความเสี่ยง: ${diagnosisData.riskLevel || ''}`
        }));
      } catch (error) {
        console.error('Error parsing diagnosis data:', error);
      }
    }

    fetchConsultations();
    if (isPatient) {
      fetchAvailableDoctors();
    }
  }, [status, session, router, isPatient]);

  const fetchConsultations = async () => {
    try {
      const response = await fetch('/api/telemedicine/consultations');
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDoctors = async () => {
    try {
      const response = await fetch('/api/telemedicine/doctors');
      if (response.ok) {
        const data = await response.json();
        setAvailableDoctors(data.doctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedConsultation || !completeForm.doctorNotes) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const response = await fetch(`/api/telemedicine/consultations/${selectedConsultation.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeForm),
      });

      if (response.ok) {
        toast.success('บันทึกผลการปรึกษาเรียบร้อยแล้ว');
        setShowCompleteModal(false);
        setCompleteForm({
          doctorNotes: '',
          diagnosis: '',
          prescription: '',
          followUpNotes: '',
          followUpDate: ''
        });
        fetchConsultations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingForm.chiefComplaint || !bookingForm.scheduledDate || !bookingForm.scheduledTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const scheduledAt = new Date(`${bookingForm.scheduledDate}T${bookingForm.scheduledTime}`);
      
      const response = await fetch('/api/telemedicine/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chiefComplaint: bookingForm.chiefComplaint,
          scheduledAt: scheduledAt.toISOString(),
          doctorId: bookingForm.selectedDoctorId || null,
          aiDiagnosisData: aiDiagnosisData // Include AI diagnosis data
        }),
      });

      if (response.ok) {
        toast.success('จองการปรึกษาเรียบร้อยแล้ว');
        setShowBookingModal(false);
        setBookingForm({
          chiefComplaint: '',
          scheduledDate: '',
          scheduledTime: '',
          selectedDoctorId: ''
        });
        fetchConsultations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to book consultation');
      }
    } catch (error) {
      console.error('Error booking consultation:', error);
      toast.error('Error booking consultation');
    }
  };

  const joinVideoCall = (consultation: TelemedConsultation) => {
    if (consultation.callUrl) {
      window.open(consultation.callUrl, '_blank');
    } else {
      toast.error('Video call not yet available');
    }
  };

  const startConsultation = async (consultationId: string) => {
    try {
      const response = await fetch(`/api/telemedicine/consultations/${consultationId}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Consultation started');
        fetchConsultations();
        
        if (data.callUrl) {
          window.open(data.callUrl, '_blank');
        }
      } else {
        toast.error('Failed to start consultation');
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Error starting consultation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const upcomingConsultations = consultations.filter(c => 
    ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(c.status)
  );
  
  const pastConsultations = consultations.filter(c => 
    ['COMPLETED', 'CANCELLED'].includes(c.status)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                🏥 การแพทย์ทางไกล
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isDoctor ? 'จัดการการปรึกษาผู้ป่วยของคุณ' : 'จองและจัดการการปรึกษาแพทย์ของคุณ'}
              </p>
            </div>
            {isPatient && (
              <button
                onClick={() => setShowBookingModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                📞 จองการปรึกษา
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📅 Upcoming ({upcomingConsultations.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'past'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Past Consultations ({pastConsultations.length})
            </button>
            {isPatient && (
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'available'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👨‍⚕️ Available Doctors ({availableDoctors.length})
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcomingConsultations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">📅</div>
                <p className="text-gray-500 mb-4">No upcoming consultations</p>
                {isPatient && (
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="text-green-600 hover:text-green-700"
                  >
                    Book your first consultation
                  </button>
                )}
              </div>
            ) : (
              upcomingConsultations.map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {isDoctor ? `Patient: ${consultation.patient?.name}` : `Dr. ${consultation.doctor?.name || 'TBD'}`}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(consultation.status)}`}>
                          {consultation.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Chief Complaint:</span>
                          <p className="mt-1">{consultation.chiefComplaint}</p>
                        </div>
                        <div>
                          <span className="font-medium">Scheduled:</span>
                          <p className="mt-1">
                            {consultation.scheduledAt 
                              ? new Date(consultation.scheduledAt).toLocaleString()
                              : 'TBD'
                            }
                          </p>
                        </div>
                        {consultation.riskAssessment && (
                          <div className="sm:col-span-2">
                            <span className="font-medium">Related Symptoms:</span>
                            <p className="mt-1">{consultation.riskAssessment.primarySymptoms.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col sm:flex-row gap-2">
                      {consultation.status === 'SCHEDULED' && (
                        <>
                          {consultation.callUrl && (
                            <button
                              onClick={() => joinVideoCall(consultation)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                            >
                              🎥 Join Call
                            </button>
                          )}
                          {isDoctor && (
                            <button
                              onClick={() => startConsultation(consultation.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                            >
                              🚀 Start
                            </button>
                          )}
                        </>
                      )}
                      
                      {consultation.status === 'IN_PROGRESS' && consultation.callUrl && (
                        <button
                          onClick={() => joinVideoCall(consultation)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm animate-pulse"
                        >
                          🎥 Join Active Call
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedConsultation(consultation)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'past' && (
          <div className="space-y-4">
            {pastConsultations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">📋</div>
                <p className="text-gray-500">No past consultations</p>
              </div>
            ) : (
              pastConsultations.map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {isDoctor ? `Patient: ${consultation.patient?.name}` : `Dr. ${consultation.doctor?.name}`}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(consultation.status)}`}>
                          {consultation.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Duration:</span>
                          <p className="mt-1">{consultation.duration ? `${consultation.duration} minutes` : 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>
                          <p className="mt-1">
                            {consultation.endedAt 
                              ? new Date(consultation.endedAt).toLocaleDateString()
                              : new Date(consultation.createdAt).toLocaleDateString()
                            }
                          </p>
                        </div>
                        {consultation.diagnosis && (
                          <div className="sm:col-span-2">
                            <span className="font-medium">Diagnosis:</span>
                            <p className="mt-1">{consultation.diagnosis}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 sm:ml-6">
                      <button
                        onClick={() => setSelectedConsultation(consultation)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'available' && isPatient && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableDoctors.map((doctor) => (
              <div key={doctor.id} className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                    {doctor.profileImage ? (
                      <img 
                        src={doctor.profileImage} 
                        alt={doctor.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">👨‍⚕️</span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Dr. {doctor.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{doctor.email}</p>
                  <button
                    onClick={() => {
                      setBookingForm(prev => ({ ...prev, selectedDoctorId: doctor.id }));
                      setShowBookingModal(true);
                    }}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Book with Dr. {doctor.name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Book Consultation</h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleBookConsultation} className="space-y-4">
              {aiDiagnosisData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">🤖 ข้อมูลจากการวิเคราะห์ AI</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>วินิจฉัยเบื้องต้น:</strong> {aiDiagnosisData.preliminary?.diagnosis}</div>
                    <div><strong>อาการ:</strong> {aiDiagnosisData.symptoms?.join(', ')}</div>
                    <div><strong>ระดับเสี่ยง:</strong> {aiDiagnosisData.riskLevel}</div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อาการหลักและรายละเอียด *
                </label>
                <textarea
                  value={bookingForm.chiefComplaint}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  rows={aiDiagnosisData ? 5 : 3}
                  className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder={aiDiagnosisData ? "ข้อมูลจาก AI ถูกเติมไว้แล้ว คุณสามารถเพิ่มรายละเอียดเพิ่มเติมได้..." : "อธิบายอาการหลักที่คุณกังวล..."}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    value={bookingForm.scheduledDate}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Time *
                  </label>
                  <input
                    type="time"
                    value={bookingForm.scheduledTime}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>
              
              {availableDoctors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Doctor (Optional)
                  </label>
                  <select
                    value={bookingForm.selectedDoctorId}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, selectedDoctorId: e.target.value }))}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Any available doctor</option>
                    {availableDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Book Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consultation Details Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Consultation Details</h2>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedConsultation.status)}`}>
                    {selectedConsultation.status}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {isDoctor ? 'Patient:' : 'Doctor:'}
                  </span>
                  <span className="ml-2 text-sm text-gray-900">
                    {isDoctor 
                      ? selectedConsultation.patient?.name 
                      : selectedConsultation.doctor?.name || 'TBD'
                    }
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Chief Complaint:</span>
                <p className="mt-1 text-sm text-gray-900">{selectedConsultation.chiefComplaint}</p>
              </div>
              
              {selectedConsultation.doctorNotes && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Doctor's Notes:</span>
                  <p className="mt-1 text-sm text-gray-900">{selectedConsultation.doctorNotes}</p>
                </div>
              )}
              
              {selectedConsultation.diagnosis && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Diagnosis:</span>
                  <p className="mt-1 text-sm text-gray-900">{selectedConsultation.diagnosis}</p>
                </div>
              )}
              
              {selectedConsultation.prescription && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Prescription:</span>
                  <p className="mt-1 text-sm text-gray-900">{selectedConsultation.prescription}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedConsultation(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
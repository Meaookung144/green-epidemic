'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface RiskAssessment {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string | null;
  primarySymptoms: string[];
  severity: number;
  duration: string;
  riskLevel: string;
  priority: string;
  recommendation: string;
  notes: string | null;
  doctorConsultation: boolean;
  doctorNotes: string | null;
  doctorRecommendation: string | null;
  consultationDate: string | null;
  assessedBy: string;
  location: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

const commonSymptoms = [
  'Fever', 'Cough', 'Sore throat', 'Runny nose', 'Headache',
  'Body aches', 'Fatigue', 'Nausea', 'Vomiting', 'Diarrhea',
  'Difficulty breathing', 'Chest pain', 'Dizziness', 'Confusion',
  'Severe headache', 'High fever', 'Severe abdominal pain',
  'Loss of consciousness', 'Severe allergic reaction'
];

export default function RiskAssessmentPage() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [showNewAssessmentForm, setShowNewAssessmentForm] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [filters, setFilters] = useState({
    riskLevel: '',
    priority: ''
  });

  // Form state for new assessment
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    patientGender: '',
    patientPhone: '',
    primarySymptoms: [] as string[],
    customSymptom: '',
    severity: 1,
    duration: '',
    location: '',
    latitude: '',
    longitude: '',
    notes: ''
  });

  const [telemedicalForm, setTelemedicalForm] = useState({
    doctorNotes: '',
    doctorRecommendation: '',
    showForm: false,
    selectedAssessmentId: ''
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    // All authenticated users can access risk assessment

    fetchAssessments();
  }, [status, session, router, filters]);

  const fetchAssessments = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
      if (filters.priority) params.append('priority', filters.priority);

      const response = await fetch(`/api/risk-assessment?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments);
      } else {
        toast.error('Failed to load risk assessments');
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast.error('Error loading assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientName || !formData.patientAge || !formData.patientGender) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.primarySymptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }

    try {
      const response = await fetch('/api/risk-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Risk assessment created successfully');
        setShowNewAssessmentForm(false);
        setFormData({
          patientName: '',
          patientAge: '',
          patientGender: '',
          patientPhone: '',
          primarySymptoms: [],
          customSymptom: '',
          severity: 1,
          duration: '',
          location: '',
          latitude: '',
          longitude: '',
          notes: ''
        });
        fetchAssessments();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create assessment');
      }
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Error creating assessment');
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      primarySymptoms: prev.primarySymptoms.includes(symptom)
        ? prev.primarySymptoms.filter(s => s !== symptom)
        : [...prev.primarySymptoms, symptom]
    }));
  };

  const addCustomSymptom = () => {
    if (formData.customSymptom.trim() && !formData.primarySymptoms.includes(formData.customSymptom)) {
      setFormData(prev => ({
        ...prev,
        primarySymptoms: [...prev.primarySymptoms, prev.customSymptom.trim()],
        customSymptom: ''
      }));
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'ROUTINE': return 'bg-blue-100 text-blue-800';
      case 'URGENT': return 'bg-orange-100 text-orange-800';
      case 'EMERGENCY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'SELF_CARE': return 'Self Care at Home';
      case 'TELEHEALTH': return 'Telehealth Consultation';
      case 'CLINIC_VISIT': return 'Visit Clinic';
      case 'EMERGENCY': return 'Emergency Care';
      default: return recommendation;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏥 Risk Assessment & Triage</h1>
              <p className="mt-1 text-sm text-gray-600">Primary symptom sorting and telemedical consultation</p>
            </div>
            <button
              onClick={() => setShowNewAssessmentForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              + New Assessment
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Risk Levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Priorities</option>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAssessments}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Assessments List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {assessments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🏥</div>
              <p className="text-gray-500 mb-4">No risk assessments found</p>
              <p className="text-sm text-gray-400">Create your first assessment to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {assessments.map((assessment) => (
                <li key={assessment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{assessment.patientName}</h3>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getRiskLevelColor(assessment.riskLevel)}`}>
                            {assessment.riskLevel}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(assessment.priority)}`}>
                            {assessment.priority}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p><strong>Age:</strong> {assessment.patientAge}</p>
                          <p><strong>Gender:</strong> {assessment.patientGender}</p>
                          {assessment.patientPhone && <p><strong>Phone:</strong> {assessment.patientPhone}</p>}
                        </div>
                        <div>
                          <p><strong>Symptoms:</strong> {assessment.primarySymptoms.join(', ')}</p>
                          <p><strong>Severity:</strong> {assessment.severity}/5</p>
                          <p><strong>Duration:</strong> {assessment.duration}</p>
                        </div>
                        <div>
                          <p><strong>Recommendation:</strong> {getRecommendationText(assessment.recommendation)}</p>
                          <p><strong>Date:</strong> {new Date(assessment.createdAt).toLocaleDateString()}</p>
                          {assessment.doctorConsultation && (
                            <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              👨‍⚕️ Doctor Consulted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => setSelectedAssessment(assessment)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
                      >
                        View Details
                      </button>
                      {!assessment.doctorConsultation && (
                        <button
                          onClick={() => {
                            setTelemedicalForm(prev => ({
                              ...prev,
                              showForm: true,
                              selectedAssessmentId: assessment.id
                            }));
                          }}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                        >
                          👨‍⚕️ Consult Doctor
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* New Assessment Modal */}
      {showNewAssessmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">New Risk Assessment</h2>
              <button
                onClick={() => setShowNewAssessmentForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateAssessment} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input
                    type="number"
                    value={formData.patientAge}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientAge: e.target.value }))}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    value={formData.patientGender}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientGender: e.target.value }))}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.patientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Symptoms *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {commonSymptoms.map((symptom) => (
                    <label key={symptom} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.primarySymptoms.includes(symptom)}
                        onChange={() => handleSymptomToggle(symptom)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm">{symptom}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.customSymptom}
                    onChange={(e) => setFormData(prev => ({ ...prev, customSymptom: e.target.value }))}
                    placeholder="Add custom symptom"
                    className="flex-1 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomSymptom}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity (1-5) *</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.severity}
                    onChange={(e) => setFormData(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">Severity: {formData.severity}/5</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Duration</option>
                    <option value="< 24 hours">&lt; 24 hours</option>
                    <option value="1-3 days">1-3 days</option>
                    <option value="4-7 days">4-7 days</option>
                    <option value="1-2 weeks">1-2 weeks</option>
                    <option value="> 2 weeks">&gt; 2 weeks</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder="Any additional observations or notes..."
                />
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewAssessmentForm(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assessment Details Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Assessment Details</h2>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h3>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {selectedAssessment.patientName}</p>
                    <p><strong>Age:</strong> {selectedAssessment.patientAge}</p>
                    <p><strong>Gender:</strong> {selectedAssessment.patientGender}</p>
                    {selectedAssessment.patientPhone && <p><strong>Phone:</strong> {selectedAssessment.patientPhone}</p>}
                    <p><strong>Assessment Date:</strong> {new Date(selectedAssessment.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Results</h3>
                  <div className="space-y-2">
                    <p><strong>Risk Level:</strong> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getRiskLevelColor(selectedAssessment.riskLevel)}`}>
                        {selectedAssessment.riskLevel}
                      </span>
                    </p>
                    <p><strong>Priority:</strong> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedAssessment.priority)}`}>
                        {selectedAssessment.priority}
                      </span>
                    </p>
                    <p><strong>Recommendation:</strong> {getRecommendationText(selectedAssessment.recommendation)}</p>
                    <p><strong>Severity:</strong> {selectedAssessment.severity}/5</p>
                    <p><strong>Duration:</strong> {selectedAssessment.duration}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Symptoms</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAssessment.primarySymptoms.map((symptom, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>

              {selectedAssessment.notes && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedAssessment.notes}</p>
                </div>
              )}

              {selectedAssessment.doctorConsultation && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">👨‍⚕️ Doctor Consultation</h3>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p><strong>Consultation Date:</strong> {selectedAssessment.consultationDate ? new Date(selectedAssessment.consultationDate).toLocaleString() : 'N/A'}</p>
                    {selectedAssessment.doctorNotes && (
                      <div className="mt-2">
                        <p><strong>Doctor&apos;s Notes:</strong></p>
                        <p className="mt-1">{selectedAssessment.doctorNotes}</p>
                      </div>
                    )}
                    {selectedAssessment.doctorRecommendation && (
                      <div className="mt-2">
                        <p><strong>Doctor&apos;s Recommendation:</strong></p>
                        <p className="mt-1">{selectedAssessment.doctorRecommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 text-right">
              <button
                onClick={() => setSelectedAssessment(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telemedical Consultation Modal */}
      {telemedicalForm.showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">👨‍⚕️ Doctor Consultation</h2>
              <button
                onClick={() => setTelemedicalForm(prev => ({ ...prev, showForm: false }))}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              // Handle doctor consultation submission
              toast.success('Doctor consultation recorded (Demo)');
              setTelemedicalForm(prev => ({ ...prev, showForm: false }));
              fetchAssessments();
            }} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doctor&apos;s Notes</label>
                  <textarea
                    value={telemedicalForm.doctorNotes}
                    onChange={(e) => setTelemedicalForm(prev => ({ ...prev, doctorNotes: e.target.value }))}
                    rows={4}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter clinical observations and assessment..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doctor&apos;s Recommendation</label>
                  <textarea
                    value={telemedicalForm.doctorRecommendation}
                    onChange={(e) => setTelemedicalForm(prev => ({ ...prev, doctorRecommendation: e.target.value }))}
                    rows={3}
                    className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter treatment recommendations..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setTelemedicalForm(prev => ({ ...prev, showForm: false }))}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Save Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
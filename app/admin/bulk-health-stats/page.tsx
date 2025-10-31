'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Upload, FileDown, Search, Filter, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import ThailandLocationSelector from '@/components/ThailandLocationSelector';
import { DatePicker } from '@/components/ui/date-picker';

interface BulkHealthStat {
  id: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  postcode: string | null;
  diseaseType: string;
  caseCount: number;
  populationCount: number | null;
  severity: string | null;
  ageGroup: string | null;
  gender: string | null;
  reportDate: string;
  sourceType: string;
  sourceReference: string | null;
  reportedBy: string;
  notes: string | null;
  createdAt: string;
}

export default function BulkHealthStatsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<BulkHealthStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceReference, setSourceReference] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    province: '',
    district: '',
    diseaseType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });

  useEffect(() => {
    fetchBulkHealthStats();
  }, [filters]);

  const fetchBulkHealthStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/admin/bulk-health-stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || []);
      } else {
        toast.error('Failed to fetch bulk health statistics');
      }
    } catch (error) {
      console.error('Error fetching bulk health stats:', error);
      toast.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a CSV file');
      return;
    }

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('csvFile', selectedFile);
      formData.append('sourceReference', sourceReference || selectedFile.name);

      const response = await fetch('/api/admin/bulk-health-stats/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Import completed: ${result.summary.successCount} records imported`);
        if (result.summary.failCount > 0) {
          toast.error(`${result.summary.failCount} records failed to import`);
        }
        setSelectedFile(null);
        setSourceReference('');
        fetchBulkHealthStats();
      } else {
        toast.error(result.error || 'Import failed');
        if (result.errors && result.errors.length > 0) {
          console.error('Import errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `province,district,subdistrict,postcode,diseaseType,caseCount,populationCount,severity,ageGroup,gender,reportDate,notes
กรุงเทพมหานคร,เขตบางกะปิ,หนองบอน,10240,ไข้หวัดใหญ่,25,50000,MEDIUM,20-40,ชาย,2024-10-29,รายงานจากโรงพยาบาล
เชียงใหม่,เมืองเชียงใหม่,ศรีภูมิ,50200,โควิด-19,12,30000,HIGH,40-60,หญิง,2024-10-28,ผู้ป่วยในชุมชน
ขอนแก่น,เมืองขอนแก่น,ในเมือง,40000,ไข้เลือดออก,8,45000,HIGH,10-30,ชาย,2024-10-27,การระบาดในพื้นที่
ภูเก็ต,เมืองภูเก็ต,ตลาดใหญ่,83000,อาหารเป็นพิษ,15,25000,MEDIUM,ALL,ทั้งสองเพศ,2024-10-26,จากร้านอาหาร`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-health-stats-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded');
  };

  const handleLocationChange = (location: any) => {
    setFilters(prev => ({
      ...prev,
      province: location.province || '',
      district: location.district || '',
      page: 1
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">สถิติสุขภาพจำนวนมาก</h1>
          <p className="text-gray-600 mt-2">จัดการและนำเข้าข้อมูลสถิติสุขภาพจากหน่วยงานต่างๆ</p>
        </div>
        <button
          onClick={downloadSampleCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FileDown className="w-4 h-4" />
          <span>ดาวน์โหลดตัวอย่าง CSV</span>
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">นำเข้าข้อมูลจาก CSV</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกไฟล์ CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              แหล่งข้อมูล (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              placeholder="เช่น กรมควบคุมโรค, โรงพยาบาลนครพิงค์"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || uploadLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>{uploadLoading ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">ค้นหาและกรองข้อมูล</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ประเภทโรค
            </label>
            <input
              type="text"
              value={filters.diseaseType}
              onChange={(e) => setFilters(prev => ({ ...prev, diseaseType: e.target.value, page: 1 }))}
              placeholder="เช่น ไข้หวัดใหญ่, โควิด-19"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                province: '',
                district: '',
                diseaseType: '',
                startDate: '',
                endDate: '',
                page: 1,
                limit: 50
              })}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        
        <div className="mt-4">
          <ThailandLocationSelector
            onLocationChange={handleLocationChange}
            selectedLocation={{
              province: filters.province,
              district: filters.district
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">ข้อมูลสถิติสุขภาพ</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จังหวัด/อำเภอ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ประเภทโรค
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวนผู้ป่วย
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ความรุนแรง
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    กลุ่มอายุ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่รายงาน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    แหล่งข้อมูล
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((stat) => (
                  <tr key={stat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {stat.province}
                        </div>
                        {stat.district && (
                          <div className="text-sm text-gray-500">
                            {stat.district}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{stat.diseaseType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {stat.caseCount.toLocaleString()}
                      </span>
                      {stat.populationCount && (
                        <div className="text-xs text-gray-500">
                          จาก {stat.populationCount.toLocaleString()} คน
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stat.severity && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stat.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          stat.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {stat.severity}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.ageGroup || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(stat.reportDate).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.sourceType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {stats.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">ไม่พบข้อมูลสถิติสุขภาพ</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}